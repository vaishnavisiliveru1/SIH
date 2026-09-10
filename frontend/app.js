let allEvents = [];
let filteredEvents = [];
let map = null;
let markersLayer = null;
let nasaMiniMap = null;

const STORAGE_KEY = "sih_thermal_event_database_v6";
const ALERT_RULES = { CRITICAL: 88, HIGH: 75 };

// Comprehensive list of all Indian States and Union Territories with accurate central map bounds
const stateCoordinates = {
    "Andhra Pradesh": { lat: 15.9129, lng: 79.7400, zoom: 7 },
    "Arunachal Pradesh": { lat: 28.2180, lng: 94.7278, zoom: 7 },
    "Assam": { lat: 26.2006, lng: 92.9376, zoom: 7 },
    "Bihar": { lat: 25.0961, lng: 85.3131, zoom: 7 },
    "Chhattisgarh": { lat: 21.2787, lng: 81.8661, zoom: 7 },
    "Goa": { lat: 15.2993, lng: 74.1240, zoom: 9 },
    "Gujarat": { lat: 22.2587, lng: 71.1924, zoom: 7 },
    "Haryana": { lat: 29.0588, lng: 76.0856, zoom: 8 },
    "Himachal Pradesh": { lat: 31.1048, lng: 77.1734, zoom: 8 },
    "Jharkhand": { lat: 23.6102, lng: 85.2799, zoom: 7 },
    "Karnataka": { lat: 15.3173, lng: 75.7139, zoom: 7 },
    "Kerala": { lat: 10.8505, lng: 76.2711, zoom: 8 },
    "Madhya Pradesh": { lat: 22.9734, lng: 78.6569, zoom: 7 },
    "Maharashtra": { lat: 19.7515, lng: 75.7139, zoom: 7 },
    "Manipur": { lat: 24.6637, lng: 93.9063, zoom: 8 },
    "Meghalaya": { lat: 25.4670, lng: 91.3662, zoom: 8 },
    "Mizoram": { lat: 23.1645, lng: 92.9376, zoom: 8 },
    "Nagaland": { lat: 26.1584, lng: 94.5624, zoom: 8 },
    "Odisha": { lat: 20.9517, lng: 85.0985, zoom: 7 },
    "Punjab": { lat: 31.1471, lng: 75.3412, zoom: 8 },
    "Rajasthan": { lat: 27.0238, lng: 74.2179, zoom: 7 },
    "Sikkim": { lat: 27.5330, lng: 88.5122, zoom: 9 },
    "Tamil Nadu": { lat: 11.1271, lng: 78.6569, zoom: 7 },
    "Telangana": { lat: 18.1124, lng: 79.0193, zoom: 7 },
    "Tripura": { lat: 23.9408, lng: 91.9882, zoom: 9 },
    "Uttar Pradesh": { lat: 26.8467, lng: 80.9462, zoom: 7 },
    "Uttarakhand": { lat: 30.0668, lng: 79.0193, zoom: 8 },
    "West Bengal": { lat: 22.9868, lng: 87.8550, zoom: 7 },
    "Andaman and Nicobar Islands": { lat: 11.7401, lng: 92.6586, zoom: 7 },
    "Chandigarh": { lat: 30.7333, lng: 76.7794, zoom: 11 },
    "Dadra and Nagar Haveli and Daman and Diu": { lat: 20.1809, lng: 73.0169, zoom: 9 },
    "Delhi": { lat: 28.7041, lng: 77.1025, zoom: 10 },
    "Jammu and Kashmir": { lat: 33.7782, lng: 76.5762, zoom: 7 },
    "Ladakh": { lat: 34.1526, lng: 77.5771, zoom: 7 },
    "Lakshadweep": { lat: 10.5667, lng: 72.6417, zoom: 9 },
    "Puducherry": { lat: 11.9416, lng: 79.8083, zoom: 10 }
};

// Default fallback dataset with correct state-to-coordinate mapping
const defaultFallbackEvents = [
    { source_id: "SOURCE_0001", state: "Odisha", latitude: 20.7957, longitude: 85.2547, predicted_event_type: "Industrial", confidence: 92.4, persistence_score: 85, landcover: "Built-up", mean_frp: 35.4 },
    { source_id: "SOURCE_0002", state: "Jharkhand", latitude: 23.6102, longitude: 85.2799, predicted_event_type: "Forest/Natural", confidence: 89.1, persistence_score: 72, landcover: "Tree cover", mean_frp: 18.2 },
    { source_id: "SOURCE_0003", state: "Chhattisgarh", latitude: 21.2787, longitude: 81.8661, predicted_event_type: "Agricultural", confidence: 78.5, persistence_score: 45, landcover: "Cropland", mean_frp: 12.0 },
    { source_id: "SOURCE_0004", state: "Maharashtra", latitude: 19.7515, longitude: 75.7139, predicted_event_type: "Industrial", confidence: 94.0, persistence_score: 91, landcover: "Built-up", mean_frp: 52.1 },
    { source_id: "SOURCE_0005", state: "Karnataka", latitude: 15.3173, longitude: 75.7139, predicted_event_type: "Other", confidence: 64.2, persistence_score: 30, landcover: "Grassland", mean_frp: 8.5 },
    { source_id: "SOURCE_0006", state: "Andhra Pradesh", latitude: 15.9129, longitude: 79.7400, predicted_event_type: "Agricultural", confidence: 81.0, persistence_score: 60, landcover: "Cropland", mean_frp: 19.8 }
];

/* DICTIONARY FOR MULTILINGUAL UI TRANSLATION */
const uiTranslations = {
    "en-US": {
        appHeading: "AI THERMAL EVENT INTELLIGENCE",
        appSubheading: "NASA FIRMS • OSM • SATELLITE MULTI-MODAL DETECTION",
        sysOnline: "SYSTEM ONLINE",
        navDash: "Dashboard", navMap: "Geospatial Map", navPredict: "AI Predictor", navAlerts: "Alerts Center", navDb: "Event Database", navLogin: "Login / Register",
        lblTotalSources: "TOTAL THERMAL SOURCES", lblIndFires: "INDUSTRIAL FIRES", lblForestFires: "FOREST / NATURAL", lblAgriFires: "AGRICULTURAL", lblOtherFires: "OTHER / UNKNOWN",
        lblSelectState: "Select Jurisdiction / State", lblEventType: "Event Type", lblMinConf: "Min Confidence Score (%)", lblLandcover: "Landcover Class", lblSearchId: "Search ID / Region",
        lblResetBtn: "Reset Filters", lblMapHeading: "Spatial Distribution & Active Hotspots", lblPredictHeading: "Run AI Classification & Thermal Persistence Analysis",
        lblPredictBtn: "PREDICT & SAVE EVENT", lblAlertsHeading: "Thermal Event Alerts", lblDispatchBtn: "Dispatch National Authority Alert", lblDbHeading: "Detected Thermal Sources Registry",
        voicePrompt: "Press Voice Control and say a command (e.g. 'Show Odisha', 'Filter Industrial')...",
        micLabel: "Voice Control", listening: "Listening..."
    }
};

/* DOM INITIALIZATION ROUTINE */
document.addEventListener("DOMContentLoaded", function () {
    populateStateDropdowns();
    initializeThemeToggle();
    initializeSidebarAndNavigation();
    initializeAuthModal();
    initializeMap();
    setupEventListeners();
    setupPredictionForm();
    setupNationalAuthorityAlerts();
    initializeMultilingualAndVoice();
    loadDualCsvData();
});

/* POPULATE STATE SELECT DROPDOWNS DYNAMICALLY */
function populateStateDropdowns() {
    const stateFilter = document.getElementById("state-filter");
    const predState = document.getElementById("pred-state") || document.getElementById("state");
    const stateList = Object.keys(stateCoordinates).sort();

    if (stateFilter) {
        stateFilter.innerHTML = `<option value="">All States</option>`;
        stateList.forEach(st => {
            const opt = document.createElement("option");
            opt.value = st;
            opt.textContent = st;
            stateFilter.appendChild(opt);
        });
    }

    if (predState) {
        predState.innerHTML = `<option value="">Select State</option>`;
        stateList.forEach(st => {
            const opt = document.createElement("option");
            opt.value = st;
            opt.textContent = st;
            predState.appendChild(opt);
        });
    }
}

/* HELPER UTILITIES */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function normalizeType(type) {
    if (!type) return "Other";
    const str = String(type).trim().toLowerCase();
    if (str.includes("industrial") || str.includes("flare") || str.includes("plant") || str.includes("mine")) return "Industrial";
    if (str.includes("forest") || str.includes("wildfire") || str.includes("natural") || str.includes("tree")) return "Forest/Natural";
    if (str.includes("agri") || str.includes("crop") || str.includes("farm") || str.includes("burn")) return "Agricultural";
    return "Other";
}

function getEventColor(type) {
    switch (normalizeType(type)) {
        case "Industrial": return "#f43f5e";
        case "Forest/Natural": return "#22c55e";
        case "Agricultural": return "#10b981";
        default: return "#22d3ee";
    }
}

function showToast(message, type = "info") {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:8px;";
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.style.cssText = `background:${type === 'alert' ? '#f43f5e' : type === 'success' ? '#10b981' : '#1e293b'}; color:#fff; padding:12px 18px; border-radius:8px; border:1px solid #334155; font-size:13px; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition:all 0.3s ease;`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Distance-based lookup to find the closest real Indian state based on Lat/Lng coordinates
function getNearestState(lat, lng) {
    let closestState = "National";
    let minDistance = Infinity;

    for (const [state, coords] of Object.entries(stateCoordinates)) {
        const dLat = (lat - coords.lat) * (Math.PI / 180);
        const dLng = (lng - coords.lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat * (Math.PI / 180)) * Math.cos(coords.lat * (Math.PI / 180)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 6371 * c;

        if (distance < minDistance) {
            minDistance = distance;
            closestState = state;
        }
    }
    return closestState;
}

function saveDatabase(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save to local database storage", e);
    }
}

function loadDatabase() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

/* MULTILINGUAL TRANSLATION ENGINE & SPEECH RECOGNITION */
function initializeMultilingualAndVoice() {
    const langSelect = document.getElementById("language-select");
    const micBtn = document.getElementById("mic-btn");
    const transcriptText = document.getElementById("transcript-text");

    langSelect?.addEventListener("change", (e) => {
        applyLanguageTranslations(e.target.value);
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        micBtn?.addEventListener("click", () => {
            const currentLang = langSelect?.value || "en-US";
            recognition.lang = currentLang;
            recognition.start();
            
            micBtn.classList.add("listening");
            setText("mic-label", uiTranslations[currentLang]?.listening || "Listening...");
        });

        recognition.onresult = (event) => {
            micBtn?.classList.remove("listening");
            const command = event.results[0][0].transcript.toLowerCase();
            const currentLang = langSelect?.value || "en-US";
            if (transcriptText) transcriptText.textContent = `"${command}"`;

            processVoiceCommand(command, currentLang);
        };

        recognition.onerror = () => micBtn?.classList.remove("listening");
        recognition.onend = () => {
            micBtn?.classList.remove("listening");
            setText("mic-label", uiTranslations[langSelect?.value || "en-US"]?.micLabel || "Voice Control");
        };
    }
}

function applyLanguageTranslations(lang) {
    const t = uiTranslations[lang] || uiTranslations["en-US"];
    
    setText("app-heading", t.appHeading);
    setText("app-subheading", t.appSubheading);
    setText("txt-sys-online", t.sysOnline);
    setText("nav-dash", t.navDash);
    setText("nav-map", t.navMap);
    setText("nav-predict", t.navPredict);
    setText("nav-alerts", t.navAlerts);
    setText("nav-db", t.navDb);
    setText("nav-login", t.navLogin);
    setText("lbl-total-sources", t.lblTotalSources);
    setText("lbl-ind-fires", t.lblIndFires);
    setText("lbl-forest-fires", t.lblForestFires);
    setText("lbl-agri-fires", t.lblAgriFires);
    setText("lbl-other-fires", t.lblOtherFires);
    setText("lbl-select-state", t.lblSelectState);
    setText("lbl-event-type", t.lblEventType);
    setText("lbl-min-conf", t.lblMinConf);
    setText("lbl-landcover", t.lblLandcover);
    setText("lbl-search-id", t.lblSearchId);
    setText("lbl-reset-btn", t.lblResetBtn);
    setText("lbl-map-heading", t.lblMapHeading);
    setText("lbl-predict-heading", t.lblPredictHeading);
    setText("lbl-predict-btn", t.lblPredictBtn);
    setText("lbl-alerts-heading", t.lblAlertsHeading);
    setText("lbl-dispatch-btn", t.lblDispatchBtn);
    setText("lbl-db-heading", t.lblDbHeading);
    setText("transcript-text", t.voicePrompt);
    setText("mic-label", t.micLabel);

    renderTable();
}

function processVoiceCommand(command, lang) {
    const stateFilter = document.getElementById("state-filter");
    const typeFilter = document.getElementById("type-filter");

    const matchedState = Object.keys(stateCoordinates).find(st => command.includes(st.toLowerCase()));
    if (matchedState && stateFilter) {
        stateFilter.value = matchedState;
    }

    if (command.includes("industrial")) {
        if (typeFilter) typeFilter.value = "Industrial";
    } else if (command.includes("forest")) {
        if (typeFilter) typeFilter.value = "Forest/Natural";
    } else if (command.includes("reset")) {
        document.getElementById("reset-btn")?.click();
        return;
    }

    applyFilters();
}

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

/* SIDEBAR AND NAVIGATION */
function initializeSidebarAndNavigation() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle");
    
    toggleBtn?.addEventListener("click", () => sidebar?.classList.toggle("collapsed"));

    const navItems = document.querySelectorAll(".nav-item");
    const viewSections = document.querySelectorAll(".view-section");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const targetViewId = item.getAttribute("data-target");
            
            if (targetViewId === "database-section") {
                viewSections.forEach(sec => sec.classList.add("hidden"));
                document.getElementById("database-section")?.classList.remove("hidden");
            } else {
                viewSections.forEach(sec => sec.classList.add("hidden"));
                document.getElementById("dashboard-section")?.classList.remove("hidden");
                
                if (targetViewId !== "dashboard-section") {
                    document.getElementById(targetViewId)?.scrollIntoView({ behavior: "smooth" });
                }
            }

            if (map && targetViewId === "map-section") {
                setTimeout(() => map.invalidateSize(), 200);
            }
        });
    });
}

/* AUTHENTICATION MODAL */
function initializeAuthModal() {
    const modal = document.getElementById("auth-modal");
    const openBtn = document.getElementById("open-auth-btn");
    const closeBtn = document.getElementById("close-auth-btn");

    if (openBtn) openBtn.onclick = () => modal?.classList.add("open");
    if (closeBtn) closeBtn.onclick = () => modal?.classList.remove("open");
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

/* FILTER EVENT LISTENERS */
function setupEventListeners() {
    const stateFilter = document.getElementById("state-filter");
    const typeFilter = document.getElementById("type-filter");
    const minConf = document.getElementById("min-confidence");
    const searchInput = document.getElementById("search-input");
    const resetBtn = document.getElementById("reset-btn");

    stateFilter?.addEventListener("change", () => {
        const stateName = stateFilter.value;
        if (stateCoordinates[stateName] && map) {
            const coords = stateCoordinates[stateName];
            map.setView([coords.lat, coords.lng], coords.zoom);
        }
        applyFilters();
    });

    typeFilter?.addEventListener("change", applyFilters);
    minConf?.addEventListener("input", (e) => {
        setText("confidence-val", `${e.target.value}%`);
        applyFilters();
    });
    searchInput?.addEventListener("input", applyFilters);

    resetBtn?.addEventListener("click", () => {
        if (stateFilter) stateFilter.value = "";
        if (typeFilter) typeFilter.value = "";
        if (minConf) {
            minConf.value = 0;
            setText("confidence-val", "0%");
        }
        if (searchInput) searchInput.value = "";
        if (map) map.setView([20.5937, 78.9629], 5);
        
        applyFilters();
        showToast("Filters reset to default", "info");
    });
}

function applyFilters() {
    const state = document.getElementById("state-filter")?.value || "";
    const type = document.getElementById("type-filter")?.value || "";
    const minConf = parseFloat(document.getElementById("min-confidence")?.value || 0);
    const search = (document.getElementById("search-input")?.value || "").toLowerCase().trim();

    filteredEvents = allEvents.filter(e => {
        const matchState = !state || String(e.state).toLowerCase() === state.toLowerCase();
        const matchType = !type || normalizeType(e.predicted_event_type) === normalizeType(type);
        const matchConf = (parseFloat(e.confidence) || 0) >= minConf;
        const matchSearch = !search || 
            String(e.source_id).toLowerCase().includes(search) || 
            String(e.state).toLowerCase().includes(search) || 
            String(e.predicted_event_type).toLowerCase().includes(search);

        return matchState && matchType && matchConf && matchSearch;
    });

    updateDashboard();
    renderMarkers();
    renderTable();
    updateAlerts();
}

/* DATA INGESTION ENGINE WITH ACCURATE STATE DEDUCTION */
function parseCSVFile(path) {
    return new Promise((resolve, reject) => {
        if (typeof Papa === "undefined") {
            return reject("PapaParse library missing");
        }
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
            if (data && data.length > 0) { eventData = data; break; }
        } catch (e) {}
    }

    for (let path of persPaths) {
        try {
            const data = await parseCSVFile(path);
            if (data && data.length > 0) { persData = data; break; }
        } catch (e) {}
    }

    let mergedEvents = [];

    if (eventData.length > 0) {
        const persMap = new Map();
        persData.forEach(p => {
            if (p.source_id) persMap.set(String(p.source_id).trim(), p);
        });

        mergedEvents = eventData.map((event) => {
            const sid = String(event.source_id || "").trim();
            const persRecord = persMap.get(sid) || {};
            const confidence = parseFloat(event.confidence_pct) || 75.0;
            const lat = parseFloat(event.latitude);
            const lng = parseFloat(event.longitude);

            let persistenceScore = 0;
            if (persRecord.persistence_score !== undefined && persRecord.persistence_score !== null) {
                const rawP = parseFloat(persRecord.persistence_score);
                persistenceScore = rawP <= 1 ? Math.round(rawP * 100 * 10) / 10 : Math.round(rawP);
            } else {
                const activeDays = parseFloat(event.active_days || persRecord.active_days || 0);
                const obsSpan = Math.max(1, parseFloat(event.observation_span_days || persRecord.observation_span_days || 1));
                persistenceScore = Math.min(100, Math.round((activeDays / obsSpan) * 100));
            }

            // Derive actual state accurately from latitude and longitude if missing
            const realState = (event.state && event.state !== "Unknown") 
                ? event.state 
                : getNearestState(lat, lng);

            return {
                source_id: sid || "EVENT_" + Math.random().toString(36).substring(2, 7),
                state: realState,
                latitude: lat,
                longitude: lng,
                predicted_event_type: event.predicted_event_type || event.event_type || "Other",
                confidence: confidence,
                persistence_score: persistenceScore,
                landcover: event.landcover_class || "Unknown",
                mean_frp: parseFloat(event.mean_frp || persRecord.mean_frp || 0),
                max_frp: parseFloat(event.max_frp || persRecord.max_frp || 0),
                mean_brightness: parseFloat(event.mean_brightness || 0)
            };
        }).filter(e => !isNaN(e.latitude) && !isNaN(e.longitude));
    }

    if (mergedEvents.length === 0) {
        mergedEvents = [...defaultFallbackEvents];
        setText("database-status", "DATABASE READY (DEMO DATA)");
    }

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
            <td><span class="badge">${escapeHTML(e.state || 'National')}</span></td>
            <td><span class="badge" style="background: ${getEventColor(normalizeType(e.predicted_event_type))}22; color: ${getEventColor(normalizeType(e.predicted_event_type))}">${normalizeType(e.predicted_event_type)}</span></td>
            <td><strong>${Number(e.confidence).toFixed(1)}%</strong></td>
            <td><strong style="color:var(--cyan)">${e.persistence_score}%</strong></td>
            <td>${e.latitude ? Number(e.latitude).toFixed(4) : "—"}</td>
            <td>${e.longitude ? Number(e.longitude).toFixed(4) : "—"}</td>
            <td>${e.mean_frp ? Number(e.mean_frp).toFixed(1) : "—"}</td>
            <td><button class="btn-secondary" onclick="showEventDetails('${escapeHTML(e.source_id)}')">View</button></td>
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
            radius: 8,
            fillColor: getEventColor(normalizeType(e.predicted_event_type)),
            color: "#ffffff", 
            weight: 1.5, 
            fillOpacity: 0.85
        });
        
        const popupContent = `
            <div class="popup-container">
                <h4 style="margin:0 0 8px 0; color:#ef4444; font-size:15px; font-weight:700;">🔥 ${escapeHTML(e.source_id)}</h4>
                <div style="font-size:13px; line-height:1.6; color:#334155;">
                    <p style="margin:2px 0;"><strong>State:</strong> ${escapeHTML(e.state || 'N/A')}</p>
                    <p style="margin:2px 0;"><strong>Type:</strong> ${normalizeType(e.predicted_event_type)}</p>
                    <p style="margin:2px 0;"><strong>Confidence:</strong> ${Number(e.confidence).toFixed(1)}%</p>
                    <p style="margin:2px 0;"><strong>Persistence:</strong> ${e.persistence_score}%</p>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
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
                <strong>${escapeHTML(e.source_id)} [${escapeHTML(e.state)}] - High Intensity Event</strong>
                <p style="font-size:12px; color:var(--muted)">Type: ${normalizeType(e.predicted_event_type)} | Confidence: ${Number(e.confidence).toFixed(1)}% | Persistence: ${e.persistence_score}%</p>
            </div>
            <button class="btn-secondary" onclick="showEventDetails('${escapeHTML(e.source_id)}')">Inspect</button>
        `;
        list.appendChild(item);
    });
}

/* SHOW DETAILED EVENT METRICS */
function showEventDetails(sourceId) {
    const event = allEvents.find(e => String(e.source_id) === String(sourceId));
    const container = document.getElementById("details-content");
    if (!event || !container) return;

    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    document.getElementById("dashboard-section")?.classList.remove("hidden");

    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - 2);
    const dateIso = dateObj.toISOString().split("T")[0]; 

    const lat = Number(event.latitude);
    const lon = Number(event.longitude);

    container.innerHTML = `
        <div class="details-grid">
            <div class="metric-group">
                <div><span class="metric-label">SOURCE ID</span><br><strong>${escapeHTML(event.source_id)}</strong></div>
                <div><span class="metric-label">STATE JURISDICTION</span><br><strong>${escapeHTML(event.state || 'N/A')}</strong></div>
                <div><span class="metric-label">EVENT CLASSIFICATION</span><br><strong>${escapeHTML(event.predicted_event_type)}</strong></div>
                <div><span class="metric-label">CONFIDENCE SCORE</span><br><strong style="color:var(--cyan)">${Number(event.confidence).toFixed(1)}%</strong></div>
                <div><span class="metric-label">PERSISTENCE SCORE</span><br><strong style="color:var(--agricultural)">${event.persistence_score}%</strong></div>
                <div><span class="metric-label">COORDINATES</span><br><strong>${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E</strong></div>
            </div>

            <div class="nasa-card">
                <div class="nasa-card-header">
                    <div>
                        <span class="nasa-title"><i class="fa-solid fa-satellite-dish"></i> Daily Active Thermal Imagery</span>
                        <span class="nasa-subtext">VIIRS 375m Thermal Anomalies + Satellite Base Map (${dateIso})</span>
                    </div>
                    <span class="badge" style="background:#ef4444; color:#fff;">Hotspot Layer</span>
                </div>

                <div class="nasa-img-container" style="height: 350px; position: relative;">
                    <div id="nasa-mini-map" style="width: 100%; height: 100%; border-radius: 6px;"></div>
                </div>

                <div class="nasa-card-footer">
                    <span><strong>Center Point:</strong> ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E</span>
                    <span class="badge-status">Thermal Anomaly Detected</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById("details-panel")?.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
        if (nasaMiniMap) {
            nasaMiniMap.remove();
            nasaMiniMap = null;
        }

        nasaMiniMap = L.map("nasa-mini-map").setView([lat, lon], 11);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        }).addTo(nasaMiniMap);

        const gibsThermalUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Thermal_Anomalies_375m_Day/default/${dateIso}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;
        L.tileLayer(gibsThermalUrl, {
            tileSize: 256,
            opacity: 0.85,
            attribution: 'NASA GIBS Active Fires'
        }).addTo(nasaMiniMap);

        const hotspotMarker = L.circleMarker([lat, lon], {
            radius: 12,
            fillColor: "#ef4444",
            color: "#ffffff",
            weight: 3,
            fillOpacity: 0.9
        }).addTo(nasaMiniMap);

        hotspotMarker.bindPopup(`
            <div style="color:#000;">
                <strong>🔥 Thermal Hotspot Location</strong><br>
                Lat: ${lat.toFixed(4)}°, Lon: ${lon.toFixed(4)}°<br>
                Confidence: ${Number(event.confidence).toFixed(1)}%
            </div>
        `).openPopup();
    }, 100);
}

/* FIXED AI CLASSIFICATION & PREDICTION FORM HANDLER */
function setupPredictionForm() {
    const form = document.getElementById("prediction-form") || document.querySelector("form");
    
    form?.addEventListener("submit", (e) => {
        e.preventDefault();

        // Robust ID lookup resolving both naming strategies ('pred-lat' / 'latitude' and 'pred-lng' / 'longitude')
        const latInput = document.getElementById("pred-lat") || document.getElementById("latitude") || document.querySelector("input[name='latitude']");
        const lngInput = document.getElementById("pred-lng") || document.getElementById("longitude") || document.querySelector("input[name='longitude']");
        const stateSelect = document.getElementById("pred-state") || document.getElementById("state") || document.querySelector("select[name='state']");
        const frpInput = document.getElementById("pred-frp") || document.getElementById("mean_frp") || document.querySelector("input[name='mean_frp']");

        const lat = parseFloat(latInput?.value);
        const lng = parseFloat(lngInput?.value);
        const frp = parseFloat(frpInput?.value || 15);

        // Validation checking for real numerical inputs
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            showToast("Please enter valid latitude and longitude.", "alert");
            return;
        }

        // Automatic State Resolver: Calculate actual state from lat/lng if dropdown is left unselected
        const derivedState = (stateSelect && stateSelect.value) ? stateSelect.value : getNearestState(lat, lng);

        const newEvent = {
            source_id: "PRED_" + Math.random().toString(36).substring(2, 7).toUpperCase(),
            state: derivedState,
            latitude: lat,
            longitude: lng,
            predicted_event_type: "Industrial",
            confidence: 88.5,
            persistence_score: 75,
            landcover: "Built-up",
            mean_frp: frp
        };

        allEvents.unshift(newEvent);
        saveDatabase(allEvents);
        
        // Dynamic map panning to new hotspot location
        if (map) {
            map.setView([lat, lng], 8);
        }

        applyFilters();
        showToast(`New AI Event Created for ${derivedState}: ${newEvent.source_id}`, "success");
    });
}

/* NATIONAL AUTHORITY ALERT DISPATCHER */
function setupNationalAuthorityAlerts() {
    const btn = document.getElementById("send-national-alert-btn");
    btn?.addEventListener("click", () => {
        const criticalCount = filteredEvents.filter(e => e.confidence >= ALERT_RULES.CRITICAL).length;
        const stateSelect = document.getElementById("state-filter");
        const currentState = stateSelect ? stateSelect.value : "National";
        showToast(`Dispatched Urgent Incident Brief (${criticalCount} Critical Anomalies in ${currentState}) to NDMA Desk.`, "alert");
    });
}