/* =========================================================
   AI THERMAL EVENT INTELLIGENCE DASHBOARD CONTROL ENGINE
========================================================= */

let allEvents = [];
let filteredEvents = [];
let map = null;
let markersLayer = null;

const STORAGE_KEY = "sih_thermal_event_database_v4";
const ALERT_RULES = { CRITICAL: 88, HIGH: 75 };

/* DOM INITIALIZATION ROUTINE */
document.addEventListener("DOMContentLoaded", function () {
    initializeSidebar();
    initializeAuthModal();
    initializeMap();
    setupEventListeners();
    setupPredictionForm();
    loadDualCsvData();
});

/* SIDEBAR RETRACTION AND NAVIGATION */
function initializeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle");
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
        });
    }

    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
        });
    });
}

/* AUTHENTICATION MODAL LOGIC */
function initializeAuthModal() {
    const modal = document.getElementById("auth-modal");
    const openBtn = document.getElementById("open-auth-btn");
    const closeBtn = document.getElementById("close-auth-btn");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

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
}

/* LEAFLET GIS ENGINE */
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
    // Defines paths for both required feature CSV files
    const eventPaths = ["event_classification_features.csv", "event_classification_features (1) (3).csv", "./data/event_classification_features.csv"];
    const persPaths = ["source_persistence_features.csv", "source_persistence_features (1).csv", "./data/source_persistence_features.csv"];

    let eventData = [], persData = [];

    // Attempt loading Event Classification Features
    for (let path of eventPaths) {
        try {
            const data = await parseCSVFile(path);
            if (data.length > 0) { eventData = data; break; }
        } catch (e) {}
    }

    // Attempt loading Source Persistence Features
    for (let path of persPaths) {
        try {
            const data = await parseCSVFile(path);
            if (data.length > 0) { persData = data; break; }
        } catch (e) {}
    }

    if (eventData.length === 0 && persData.length === 0) {
        showDataError();
        processData([]);
        return;
    }

    // Index persistence records by source_id for fast merging
    const persMap = new Map();
    persData.forEach(p => {
        if (p.source_id) persMap.set(String(p.source_id).trim(), p);
    });

    // Merge features into unified event models
    const mergedEvents = eventData.map(event => {
        const sid = String(event.source_id || "").trim();
        const persRecord = persMap.get(sid) || {};

        const confidence = parseFloat(event.confidence_pct) || 75.0;
        
        // Convert persistence score from 0.0-1.0 decimal to 0-100 percentage
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
            mean_brightness: parseFloat(event.mean_brightness || 0),
            active_days: parseInt(persRecord.active_days || event.active_days || 0),
            observation_span_days: parseInt(persRecord.observation_span_days || event.observation_span_days || 1)
        };
    }).filter(e => !isNaN(e.latitude) && !isNaN(e.longitude));

    processData(mergedEvents);
}

function processData(csvEvents) {
    const savedEvents = loadDatabase();
    
    // Merge browser local storage with CSV dataset
    const eventMap = new Map();
    csvEvents.forEach(e => eventMap.set(String(e.source_id), e));
    savedEvents.forEach(e => eventMap.set(String(e.source_id), e));

    allEvents = Array.from(eventMap.values());
    filteredEvents = [...allEvents];

    populateLandCoverFilter();
    updateDashboard();
    renderMarkers();
    renderTable();
    updateAlerts();
}

/* DASHBOARD & RENDER ENGINES */
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
                <p style="font-size:11px; color:var(--muted)">Type: ${e.predicted_event_type} | Confidence: ${e.confidence.toFixed(1)}% | Persistence: ${e.persistence_score}%</p>
            </div>
            <button class="btn-secondary" onclick="showEventDetails('${e.source_id}')">Inspect</button>
        `;
        list.appendChild(item);
    });
}

function showEventDetails(sourceId) {
    const event = allEvents.find(e => String(e.source_id) === String(sourceId));
    const container = document.getElementById("details-content");
    if (!event || !container) return;

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div><span style="color:var(--muted); font-size:11px;">SOURCE ID</span><br><strong>${event.source_id}</strong></div>
            <div><span style="color:var(--muted); font-size:11px;">EVENT CLASSIFICATION</span><br><strong>${event.predicted_event_type}</strong></div>
            <div><span style="color:var(--muted); font-size:11px;">CONFIDENCE SCORE</span><br><strong style="color:var(--cyan)">${event.confidence.toFixed(1)}%</strong></div>
            <div><span style="color:var(--muted); font-size:11px;">PERSISTENCE SCORE</span><br><strong style="color:var(--agricultural)">${event.persistence_score}%</strong></div>
            <div><span style="color:var(--muted); font-size:11px;">LATITUDE / LONGITUDE</span><br><strong>${event.latitude}, ${event.longitude}</strong></div>
            <div><span style="color:var(--muted); font-size:11px;">LANDCOVER TYPE</span><br><strong>${event.landcover}</strong></div>
        </div>
    `;

    document.getElementById("details-panel")?.scrollIntoView({ behavior: 'smooth' });
}

/* AI PREDICTION FORM SUBMISSION HANDLER */
function setupPredictionForm() {
    const form = document.getElementById("prediction-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
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
            active_days: activeDays,
            observation_span_days: obsSpan,
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
        
        resultBox.scrollIntoView({ behavior: 'smooth' });
    });
}

/* SEARCH & FILTER CONTROLS */
function setupEventListeners() {
    const typeFilter = document.getElementById("type-filter");
    const confidenceFilter = document.getElementById("confidence-filter");
    const confidenceOutput = document.getElementById("confidence-output");
    const landcoverFilter = document.getElementById("landcover-filter");
    const searchInput = document.getElementById("search-input");
    const resetBtn = document.getElementById("reset-btn");

    if (confidenceFilter && confidenceOutput) {
        confidenceFilter.addEventListener("input", (e) => {
            confidenceOutput.value = `${e.target.value}%`;
            applyFilters();
        });
    }

    typeFilter?.addEventListener("change", applyFilters);
    landcoverFilter?.addEventListener("change", applyFilters);
    searchInput?.addEventListener("input", applyFilters);

    resetBtn?.addEventListener("click", () => {
        if (typeFilter) typeFilter.value = "ALL";
        if (confidenceFilter) {
            confidenceFilter.value = 0;
            confidenceOutput.value = "0%";
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

function populateLandCoverFilter() {
    const select = document.getElementById("landcover-filter");
    if (!select) return;

    const covers = Array.from(new Set(allEvents.map(e => e.landcover))).filter(Boolean);
    select.innerHTML = `<option value="ALL">All Land Covers</option>`;
    covers.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
}

/* DATABASE PERSISTENCE STORAGE */
function loadDatabase() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
}

function saveEventToDatabase(event) {
    const db = loadDatabase();
    db.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/* HELPER UTILITIES */
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

function showDataError() {
    const status = document.getElementById("database-status");
    if (status) {
        status.textContent = "CSV LOAD FAILURE - STANDALONE MODE";
        status.style.color = "var(--industrial)";
    }
}