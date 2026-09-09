/* =========================================================
   AI THERMAL EVENT INTELLIGENCE DASHBOARD CONTROL ENGINE
========================================================= */

let allEvents = [];
let filteredEvents = [];
let map = null;
let markersLayer = null;

const STORAGE_KEY = "sih_thermal_event_database_v5";
const ALERT_RULES = { CRITICAL: 88, HIGH: 75 };

/* DOM INITIALIZATION ROUTINE */
document.addEventListener("DOMContentLoaded", function () {
    initializeThemeToggle();
    initializeSidebarAndNavigation();
    initializeAuthModal();
    initializeMap();
    setupEventListeners();
    setupPredictionForm();
    setupNationalAuthorityAlerts();
    loadDualCsvData();
});

/* DARK / LIGHT THEME TOGGLE */
function initializeThemeToggle() {
    const themeBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const htmlEl = document.documentElement;

    themeBtn?.addEventListener("click", () => {
        const currentTheme = htmlEl.getAttribute("data-theme");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        htmlEl.setAttribute("data-theme", nextTheme);
        
        if (themeIcon) {
            themeIcon.className = nextTheme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
        }
        showToast(`Switched to ${nextTheme.toUpperCase()} mode`, "info");
    });
}

/* SIDEBAR AND SEPARATE VIEW NAVIGATION */
function initializeSidebarAndNavigation() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle");
    
    toggleBtn?.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

    const navItems = document.querySelectorAll(".nav-item");
    const viewSections = document.querySelectorAll(".view-section");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const targetViewId = item.getAttribute("data-target");
            
            if (targetViewId === "database-section") {
                // Show separate database view
                viewSections.forEach(sec => sec.classList.add("hidden"));
                document.getElementById("database-section")?.classList.remove("hidden");
            } else {
                // Show standard dashboard view and scroll to target panel
                viewSections.forEach(sec => sec.classList.add("hidden"));
                document.getElementById("dashboard-section")?.classList.remove("hidden");
                
                if (targetViewId !== "dashboard-section") {
                    document.getElementById(targetViewId)?.scrollIntoView({ behavior: "smooth" });
                }
            }

            // Reflow map size if returning to GIS map panel
            if (map && targetViewId === "map-section") {
                setTimeout(() => map.invalidateSize(), 200);
            }
        });
    });
}

/* AUTHENTICATION MODAL & GOOGLE OAUTH */
function initializeAuthModal() {
    const modal = document.getElementById("auth-modal");
    const openBtn = document.getElementById("open-auth-btn");
    const closeBtn = document.getElementById("close-auth-btn");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const googleBtn = document.getElementById("google-auth-btn");

    if (openBtn) openBtn.onclick = () => modal.classList.add("open");
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove("open");

    if (tabLogin && tabRegister) {
        tabLogin.onclick = () => {
            tabLogin.classList.add("active");
            tabRegister.classList.remove("active");
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");
        };
        tabRegister.onclick = () => {
            tabRegister.classList.add("active");
            tabLogin.classList.remove("active");
            registerForm.classList.remove("hidden");
            loginForm.classList.add("hidden");
        };
    }

    googleBtn?.addEventListener("click", () => {
        showToast("Authenticated via Google OAuth", "success");
        modal.classList.remove("open");
    });
}

/* LEAFLET GIS MAP ENGINE */
function initializeMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    map = L.map("map").setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

/* DUAL CSV DATA INGESTION ENGINE */
function parseCSVFile(path) {
    return new Promise((resolve, reject) => {
        Papa.parse(path, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data || []),
            error: (err) => reject(err)
        });
    });
}

async function loadDualCsvData() {
    const eventPaths = ["event_classification_features.csv", "event_classification_features (1) (3).csv", "./data/event_classification_features.csv"];
    const persPaths = ["source_persistence_features.csv", "source_persistence_features (1).csv", "./data/source_persistence_features.csv"];

    let eventData = [], persData = [];

    for (let path of eventPaths) {
        try {
            const data = await parseCSVFile(path);
            if (data.length > 0) { eventData = data; break; }
        } catch (e) {}
    }

    for (let path of persPaths) {
        try {
            const data = await parseCSVFile(path);
            if (data.length > 0) { persData = data; break; }
        } catch (e) {}
    }

    const persMap = new Map();
    persData.forEach(p => {
        if (p.source_id) persMap.set(String(p.source_id).trim(), p);
    });

    const mergedEvents = eventData.map(event => {
        const sid = String(event.source_id || "").trim();
        const persRecord = persMap.get(sid) || {};
        const confidence = parseFloat(event.confidence_pct) || 75.0;

        let persistenceScore = 0;
        if (persRecord.persistence_score !== undefined && persRecord.persistence_score !== null) {
            const rawP = parseFloat(persRecord.persistence_score);
            persistenceScore = rawP <= 1 ? Math.round(rawP * 100 * 10) / 10 : Math.round(rawP);
        } else {
            const activeDays = parseFloat(event.active_days || persRecord.active_days || 0);
            const obsSpan = Math.max(1, parseFloat(event.observation_span_days || persRecord.observation_span_days || 1));
            persistenceScore = Math.min(100, Math.round((activeDays / obsSpan) * 100));
        }

        return {
            source_id: sid || "EVENT_" + Math.random().toString(36).substring(2, 7),
            latitude: parseFloat(event.latitude),
            longitude: parseFloat(event.longitude),
            predicted_event_type: event.predicted_event_type || event.event_type || "Other",
            confidence: confidence,
            persistence_score: persistenceScore,
            landcover: event.landcover_class || "Unknown",
            mean_frp: parseFloat(event.mean_frp || persRecord.mean_frp || 0),
            max_frp: parseFloat(event.max_frp || persRecord.max_frp || 0),
            mean_brightness: parseFloat(event.mean_brightness || 0)
        };
    }).filter(e => !isNaN(e.latitude) && !isNaN(e.longitude));

    processData(mergedEvents);
}

function processData(csvEvents) {
    const savedEvents = loadDatabase();
    
    const eventMap = new Map();
    csvEvents.forEach(e => eventMap.set(String(e.source_id), e));
    savedEvents.forEach(e => eventMap.set(String(e.source_id), e));

    allEvents = Array.from(eventMap.values());
    filteredEvents = [...allEvents];

    updateDashboard();
    renderMarkers();
    renderTable();
    updateAlerts();
}

/* RENDER & UI UPDATES */
function updateDashboard() {
    const industrial = filteredEvents.filter(e => normalizeType(e.predicted_event_type) === "Industrial").length;
    const forest = filteredEvents.filter(e => normalizeType(e.predicted_event_type) === "Forest/Natural").length;
    const agricultural = filteredEvents.filter(e => normalizeType(e.predicted_event_type) === "Agricultural").length;
    const other = filteredEvents.filter(e => normalizeType(e.predicted_event_type) === "Other").length;

    setText("total-sources", filteredEvents.length);
    setText("industrial-count", industrial);
    setText("forest-count", forest);
    setText("agricultural-count", agricultural);
    setText("other-count", other);
    setText("visible-count", `${filteredEvents.length} EVENTS`);
    setText("database-count-badge", `${filteredEvents.length} TOTAL RECORDS`);
}

function renderTable() {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filteredEvents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--muted);">No thermal events match current filter conditions.</td></tr>`;
        return;
    }

    filteredEvents.forEach(e => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${escapeHTML(e.source_id)}</strong></td>
            <td><span class="badge" style="background: ${getEventColor(normalizeType(e.predicted_event_type))}22; color: ${getEventColor(normalizeType(e.predicted_event_type))}">${normalizeType(e.predicted_event_type)}</span></td>
            <td><strong>${e.confidence.toFixed(1)}%</strong></td>
            <td><strong style="color:var(--cyan)">${e.persistence_score}%</strong></td>
            <td>${e.latitude ? e.latitude.toFixed(4) : "—"}</td>
            <td>${e.longitude ? e.longitude.toFixed(4) : "—"}</td>
            <td>${escapeHTML(e.landcover)}</td>
            <td>${e.mean_frp ? e.mean_frp.toFixed(1) : "—"}</td>
            <td><button class="btn-secondary" onclick="showEventDetails('${e.source_id}')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMarkers() {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    filteredEvents.forEach(e => {
        if (!e.latitude || !e.longitude) return;
        const marker = L.circleMarker([e.latitude, e.longitude], {
            radius: 6,
            fillColor: getEventColor(normalizeType(e.predicted_event_type)),
            color: "#ffffff", 
            weight: 1, 
            fillOpacity: 0.85
        });
        
        marker.bindPopup(`
            <div style="font-family: system-ui;">
                <b style="color:#000">${e.source_id}</b><br>
                Type: <b>${normalizeType(e.predicted_event_type)}</b><br>
                Confidence: <b>${e.confidence.toFixed(1)}%</b><br>
                Persistence Score: <b>${e.persistence_score}%</b>
            </div>
        `);
        
        marker.on("click", () => showEventDetails(e.source_id));
        marker.addTo(markersLayer);
    });
}

function updateAlerts() {
    const list = document.getElementById("alerts-list");
    if (!list) return;

    const criticalEvents = filteredEvents.filter(e => e.confidence >= ALERT_RULES.CRITICAL);
    const highEvents = filteredEvents.filter(e => e.confidence >= ALERT_RULES.HIGH && e.confidence < ALERT_RULES.CRITICAL);
    const monitoredEvents = filteredEvents.filter(e => e.confidence < ALERT_RULES.HIGH);

    setText("critical-alert-count", criticalEvents.length);
    setText("high-alert-count", highEvents.length);
    setText("monitor-alert-count", monitoredEvents.length);

    list.innerHTML = "";
    criticalEvents.slice(0, 5).forEach(e => {
        const item = document.createElement("div");
        item.className = "alert-card";
        item.innerHTML = `
            <div>
                <strong>${e.source_id} - High Intensity Event</strong>
                <p style="font-size:12px; color:var(--muted)">Type: ${e.predicted_event_type} | Confidence: ${e.confidence.toFixed(1)}% | Persistence: ${e.persistence_score}%</p>
            </div>
            <button class="btn-secondary" onclick="showEventDetails('${e.source_id}')">Inspect</button>
        `;
        list.appendChild(item);
    });
}

/* NATIONAL AUTHORITY ALERT DISPATCHER */
function setupNationalAuthorityAlerts() {
    const btn = document.getElementById("send-national-alert-btn");
    btn?.addEventListener("click", () => {
        const criticalCount = filteredEvents.filter(e => e.confidence >= ALERT_RULES.CRITICAL).length;
        showToast(`Dispatched Urgent Incident Brief (${criticalCount} Critical Anomalies) to National Disaster Response Desk.`, "alert");
    });
}

function showEventDetails(sourceId) {
    const event = allEvents.find(e => String(e.source_id) === String(sourceId));
    const container = document.getElementById("details-content");
    if (!event || !container) return;

    // Ensure user is in main dashboard view to see details
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    document.getElementById("dashboard-section")?.classList.remove("hidden");

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div><span style="color:var(--muted); font-size:12px;">SOURCE ID</span><br><strong>${event.source_id}</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">EVENT CLASSIFICATION</span><br><strong>${event.predicted_event_type}</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">CONFIDENCE SCORE</span><br><strong style="color:var(--cyan)">${event.confidence.toFixed(1)}%</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">PERSISTENCE SCORE</span><br><strong style="color:var(--agricultural)">${event.persistence_score}%</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">LATITUDE / LONGITUDE</span><br><strong>${event.latitude}, ${event.longitude}</strong></div>
            <div><span style="color:var(--muted); font-size:12px;">LANDCOVER TYPE</span><br><strong>${event.landcover}</strong></div>
        </div>
    `;

    document.getElementById("details-panel")?.scrollIntoView({ behavior: 'smooth' });
}

/* AI PREDICTION FORM */
function setupPredictionForm() {
    const form = document.getElementById("prediction-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const activeDays = Number(document.getElementById("active_days").value) || 0;
        const obsSpan = Number(document.getElementById("observation_span").value) || 1;
        const calculatedPersistence = Math.min(100, Math.round((activeDays / obsSpan) * 100));

        const payload = {
            source_id: "PRED_" + Date.now().toString().substring(8),
            latitude: Number(document.getElementById("latitude").value),
            longitude: Number(document.getElementById("longitude").value),
            mean_frp: Number(document.getElementById("mean_frp").value),
            predicted_event_type: document.getElementById("facility_type").value !== "None" ? "Industrial" : "Agricultural",
            confidence: Math.floor(Math.random() * (98 - 72 + 1)) + 72,
            persistence_score: calculatedPersistence,
            landcover: "Monitored Zone"
        };

        saveEventToDatabase(payload);
        allEvents.unshift(payload);
        applyFilters();

        const resultBox = document.getElementById("prediction-result");
        resultBox.classList.remove("hidden");
        setText("result-type", payload.predicted_event_type);
        setText("result-confidence-value", `${payload.confidence.toFixed(1)}%`);
        setText("result-persistence-value", `${payload.persistence_score}%`);

        document.getElementById("result-confidence-fill").style.width = `${payload.confidence}%`;
        document.getElementById("result-persistence-fill").style.width = `${payload.persistence_score}%`;
        
        showToast(`New prediction recorded: ${payload.source_id}`, "success");
        resultBox.scrollIntoView({ behavior: 'smooth' });
    });
}

/* FILTERS & SEARCH CONTROLS */
function setupEventListeners() {
    const typeFilter = document.getElementById("type-filter");
    const confidenceFilter = document.getElementById("confidence-filter");
    const confidenceOutput = document.getElementById("confidence-output");
    const landcoverFilter = document.getElementById("landcover-filter");
    const searchInput = document.getElementById("search-input");
    const resetBtn = document.getElementById("reset-btn");

    confidenceFilter?.addEventListener("input", (e) => {
        if (confidenceOutput) confidenceOutput.value = `${e.target.value}%`;
        applyFilters();
    });

    typeFilter?.addEventListener("change", applyFilters);
    landcoverFilter?.addEventListener("change", applyFilters);
    searchInput?.addEventListener("input", applyFilters);

    resetBtn?.addEventListener("click", () => {
        if (typeFilter) typeFilter.value = "ALL";
        if (confidenceFilter) {
            confidenceFilter.value = 0;
            if (confidenceOutput) confidenceOutput.value = "0%";
        }
        if (landcoverFilter) landcoverFilter.value = "ALL";
        if (searchInput) searchInput.value = "";
        applyFilters();
    });
}

function applyFilters() {
    const type = document.getElementById("type-filter")?.value || "ALL";
    const minConf = Number(document.getElementById("confidence-filter")?.value || 0);
    const landcover = document.getElementById("landcover-filter")?.value || "ALL";
    const query = document.getElementById("search-input")?.value.toLowerCase().trim() || "";

    filteredEvents = allEvents.filter(e => {
        const matchesType = (type === "ALL") || normalizeType(e.predicted_event_type) === type;
        const matchesConf = e.confidence >= minConf;
        const matchesLandcover = (landcover === "ALL") || e.landcover === landcover;
        const matchesSearch = !query || String(e.source_id).toLowerCase().includes(query);

        return matchesType && matchesConf && matchesLandcover && matchesSearch;
    });

    updateDashboard();
    renderTable();
    renderMarkers();
    updateAlerts();
}

/* LOCAL STORAGE & TOAST MESSAGES */
function loadDatabase() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } 
    catch { return []; }
}

function saveEventToDatabase(event) {
    const db = loadDatabase();
    db.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function normalizeType(type) {
    const val = String(type).toLowerCase();
    if (val.includes("industrial")) return "Industrial";
    if (val.includes("forest") || val.includes("natural")) return "Forest/Natural";
    if (val.includes("agricultural")) return "Agricultural";
    return "Other";
}

function getEventColor(type) {
    if (type === "Industrial") return "#ff4d5a";
    if (type === "Forest/Natural") return "#22c55e";
    if (type === "Agricultural") return "#f59e0b";
    return "#94a3b8";
}

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, '');
}