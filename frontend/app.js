/* =========================================================
   AI THERMAL INTELLIGENCE ENGINE & DASHBOARD APPLICATION
========================================================= */

// Mock Dataset initialized immediately to prevent 'all zeros'
const mockThermalEvents = [
    { source_id: "SRC_001", state: "Odisha", type: "Industrial", confidence: 94, persistence: 88, lat: 20.7957, lon: 85.2547, mean_frp: 45.2, landcover: "Built-up" },
    { source_id: "SRC_002", state: "Jharkhand", type: "Industrial", confidence: 89, persistence: 92, lat: 23.6102, lon: 85.2799, mean_frp: 52.8, landcover: "Built-up" },
    { source_id: "SRC_003", state: "Chhattisgarh", type: "Forest/Natural", confidence: 76, persistence: 45, lat: 21.2787, lon: 81.8661, mean_frp: 18.4, landcover: "Tree cover" },
    { source_id: "SRC_004", state: "Odisha", type: "Forest/Natural", confidence: 82, persistence: 50, lat: 19.8135, lon: 85.8312, mean_frp: 22.1, landcover: "Tree cover" },
    { source_id: "SRC_005", state: "Maharashtra", type: "Agricultural", confidence: 65, persistence: 30, lat: 19.7515, lon: 75.7139, mean_frp: 12.0, landcover: "Cropland" },
    { source_id: "SRC_006", state: "Karnataka", type: "Agricultural", confidence: 71, persistence: 35, lat: 15.3173, lon: 75.7139, mean_frp: 14.5, landcover: "Cropland" },
    { source_id: "SRC_007", state: "Jharkhand", type: "Industrial", confidence: 91, persistence: 85, lat: 23.8000, lon: 86.4300, mean_frp: 61.3, landcover: "Built-up" },
    { source_id: "SRC_008", state: "Chhattisgarh", type: "Other", confidence: 55, persistence: 20, lat: 22.0900, lon: 82.1500, mean_frp: 8.5, landcover: "Bare / sparse vegetation" }
];

let globalEvents = [...mockThermalEvents];
let map = null;
let markersLayer = null;

// DOM LOAD INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initSidebar();
    initLeafletMap();
    initEventListeners();
    updateDashboardUI(globalEvents);
});

/* =========================================================
   GEOSPATIAL LEAFLET MAP INITIALIZATION
========================================================= */
function initLeafletMap() {
    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    // Center map over India
    map = L.map("map").setView([20.5937, 78.9629], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    // Invalidate size to ensure tiles render smoothly on load
    setTimeout(() => { map.invalidateSize(); }, 300);
}

/* =========================================================
   MAP MARKERS & OVERLAYS UPDATE
========================================================= */
function updateMapMarkers(events) {
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    events.forEach(event => {
        let color = "#a8b3cf"; // default Other
        if (event.type === "Industrial") color = "#ff4d5a";
        else if (event.type === "Forest/Natural") color = "#22c55e";
        else if (event.type === "Agricultural") color = "#f59e0b";

        const circle = L.circleMarker([event.lat, event.lon], {
            radius: Math.min(Math.max(event.mean_frp / 4, 6), 18),
            fillColor: color,
            color: "#ffffff",
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.8
        });

        const popupContent = `
            <div class="popup-container">
                <h4>${event.source_id} (${event.type})</h4>
                <p><b>State:</b> ${event.state}</p>
                <p><b>FRP:</b> ${event.mean_frp} MW</p>
                <p><b>Confidence:</b> ${event.confidence}%</p>
                <p><b>Persistence:</b> ${event.persistence}%</p>
            </div>
        `;

        circle.bindPopup(popupContent);
        circle.on("click", () => renderEventInspection(event));
        markersLayer.addLayer(circle);
    });
}

/* =========================================================
   DASHBOARD STATS & METRICS AGGREGATION
========================================================= */
function updateDashboardUI(events) {
    // 1. Update Metrics
    const totalCount = events.length;
    const industrialCount = events.filter(e => e.type === "Industrial").length;
    const forestCount = events.filter(e => e.type === "Forest/Natural").length;
    const agriCount = events.filter(e => e.type === "Agricultural").length;
    const otherCount = events.filter(e => e.type === "Other").length;

    document.getElementById("total-sources").innerText = totalCount;
    document.getElementById("industrial-count").innerText = industrialCount;
    document.getElementById("forest-count").innerText = forestCount;
    document.getElementById("agricultural-count").innerText = agriCount;
    document.getElementById("other-count").innerText = otherCount;

    document.getElementById("visible-count").innerText = `${totalCount} EVENTS`;
    document.getElementById("database-count-badge").innerText = `${totalCount} TOTAL RECORDS`;

    // 2. Update Map Markers
    updateMapMarkers(events);

    // 3. Render Database Table
    renderTable(events);

    // 4. Render Early Warning Alerts Center
    renderAlerts(events);
}

/* =========================================================
   TABLE & INSPECTION PANEL RENDERING
========================================================= */
function renderTable(events) {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (events.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--muted);">No matching thermal records found.</td></tr>`;
        return;
    }

    events.forEach(e => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${e.source_id}</b></td>
            <td>${e.state}</td>
            <td><span class="badge">${e.type}</span></td>
            <td>${e.confidence}%</td>
            <td>${e.persistence}%</td>
            <td>${e.lat.toFixed(4)}</td>
            <td>${e.lon.toFixed(4)}</td>
            <td>${e.mean_frp} MW</td>
            <td><button class="btn-secondary" style="padding:4px 8px; font-size:12px;" onclick='inspectById("${e.source_id}")'>Inspect</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderEventInspection(e) {
    const container = document.getElementById("details-content");
    if (!container) return;

    container.innerHTML = `
        <div class="details-grid">
            <div class="metric-group">
                <div class="metric-item">
                    <span class="metric-label">Source ID</span>
                    <strong>${e.source_id}</strong>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Jurisdiction</span>
                    <strong>${e.state}</strong>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Classification</span>
                    <strong>${e.type}</strong>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Mean FRP</span>
                    <strong>${e.mean_frp} MW</strong>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Landcover</span>
                    <strong>${e.landcover}</strong>
                </div>
            </div>
            <div class="nasa-card">
                <div class="nasa-card-header">
                    <span class="nasa-title"><i class="fa-solid fa-satellite"></i> NASA GIBS Imagery</span>
                    <span class="badge-status">VERIFIED</span>
                </div>
                <div class="nasa-img-container">
                    <img class="nasa-sat-img" src="https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=600&q=80" alt="Satellite imagery placeholder">
                </div>
                <div class="nasa-card-footer">
                    <span>Lat: ${e.lat.toFixed(4)}, Lon: ${e.lon.toFixed(4)}</span>
                    <span class="nasa-subtext">MODIS / VIIRS Sensor</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById("details-panel").scrollIntoView({ behavior: 'smooth' });
}

window.inspectById = function(id) {
    const item = globalEvents.find(e => e.source_id === id);
    if (item) renderEventInspection(item);
};

/* =========================================================
   ALERT CENTER AGGREGATION
========================================================= */
function renderAlerts(events) {
    const container = document.getElementById("alerts-list");
    if (!container) return;

    container.innerHTML = "";

    const critical = events.filter(e => e.type === "Industrial" && e.confidence > 80);
    const high = events.filter(e => e.type === "Forest/Natural" && e.confidence > 70);
    const monitor = events.filter(e => e.confidence <= 70);

    document.getElementById("critical-alert-count").innerText = critical.length;
    document.getElementById("high-alert-count").innerText = high.length;
    document.getElementById("monitor-alert-count").innerText = monitor.length;

    const alertList = [...critical, ...high];

    if (alertList.length === 0) {
        container.innerHTML = `<p style="color:var(--muted); font-size:13px;">No critical early warning alerts active.</p>`;
        return;
    }

    alertList.forEach(item => {
        const div = document.createElement("div");
        div.className = "alert-card";
        div.innerHTML = `
            <div>
                <strong>${item.source_id} - ${item.state} (${item.type})</strong>
                <p style="font-size:12px; color:var(--muted); margin-top:2px;">
                    Thermal FRP output: ${item.mean_frp} MW | Persistence: ${item.persistence}%
                </p>
            </div>
            <button class="btn-authority" onclick="showToast('Authority dispatched for ${item.source_id}', 'alert')">Dispatch</button>
        `;
        container.appendChild(div);
    });
}

/* =========================================================
   FILTERS & CONTROLS LISTENER
========================================================= */
function initEventListeners() {
    const stateFilter = document.getElementById("state-filter");
    const typeFilter = document.getElementById("type-filter");
    const confFilter = document.getElementById("confidence-filter");
    const confOutput = document.getElementById("confidence-output");
    const landFilter = document.getElementById("landcover-filter");
    const searchInput = document.getElementById("search-input");
    const resetBtn = document.getElementById("reset-btn");

    function applyFilters() {
        const stateVal = stateFilter.value;
        const typeVal = typeFilter.value;
        const minConf = parseInt(confFilter.value, 10) || 0;
        const landVal = landFilter.value;
        const searchVal = searchInput.value.toLowerCase().trim();

        confOutput.innerText = `${minConf}%`;

        const filtered = globalEvents.filter(item => {
            const matchesState = (stateVal === "ALL" || item.state === stateVal);
            const matchesType = (typeVal === "ALL" || item.type === typeVal);
            const matchesConf = item.confidence >= minConf;
            const matchesLand = (landVal === "ALL" || item.landcover === landVal);
            const matchesSearch = item.source_id.toLowerCase().includes(searchVal) || item.state.toLowerCase().includes(searchVal);

            return matchesState && matchesType && matchesConf && matchesLand && matchesSearch;
        });

        updateDashboardUI(filtered);
    }

    stateFilter.addEventListener("change", applyFilters);
    typeFilter.addEventListener("change", applyFilters);
    confFilter.addEventListener("input", applyFilters);
    landFilter.addEventListener("change", applyFilters);
    searchInput.addEventListener("input", applyFilters);

    resetBtn.addEventListener("click", () => {
        stateFilter.value = "ALL";
        typeFilter.value = "ALL";
        confFilter.value = 0;
        confOutput.innerText = "0%";
        landFilter.value = "ALL";
        searchInput.value = "";
        updateDashboardUI(globalEvents);
        showToast("Filters reset to default.");
    });

    // Prediction Form Submission Handler
    const predForm = document.getElementById("prediction-form");
    if (predForm) {
        predForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const lat = parseFloat(document.getElementById("latitude").value) || 20.0;
            const lon = parseFloat(document.getElementById("longitude").value) || 85.0;
            const meanFrp = parseFloat(document.getElementById("mean_frp").value) || 20.0;

            const newEvent = {
                source_id: `SRC_${Math.floor(100 + Math.random() * 900)}`,
                state: "Odisha",
                type: "Industrial",
                confidence: Math.floor(80 + Math.random() * 20),
                persistence: Math.floor(75 + Math.random() * 25),
                lat: lat,
                lon: lon,
                mean_frp: meanFrp,
                landcover: "Built-up"
            };

            globalEvents.unshift(newEvent);
            updateDashboardUI(globalEvents);

            // Display Prediction UI
            const resBox = document.getElementById("prediction-result");
            if (resBox) {
                resBox.classList.remove("hidden");
                document.getElementById("result-confidence-value").innerText = `${newEvent.confidence}%`;
                document.getElementById("result-persistence-value").innerText = `${newEvent.persistence}%`;
                document.getElementById("result-confidence-fill").style.width = `${newEvent.confidence}%`;
                document.getElementById("result-persistence-fill").style.width = `${newEvent.persistence}%`;
            }

            showToast(`Predicted and added new source ${newEvent.source_id}`, "success");
        });
    }

    // Modal Events
    const authModal = document.getElementById("auth-modal");
    const openAuthBtn = document.getElementById("open-auth-btn");
    const closeAuthBtn = document.getElementById("close-auth-btn");

    if (openAuthBtn && authModal) openAuthBtn.addEventListener("click", () => authModal.classList.add("open"));
    if (closeAuthBtn && authModal) closeAuthBtn.addEventListener("click", () => authModal.classList.remove("open"));

    // Voice recognition placeholder
    const micBtn = document.getElementById("mic-btn");
    if (micBtn) {
        micBtn.addEventListener("click", () => {
            micBtn.classList.toggle("listening");
            if (micBtn.classList.contains("listening")) {
                document.getElementById("transcript-text").innerText = "Listening for voice command...";
                showToast("Voice control activated.");
            } else {
                document.getElementById("transcript-text").innerText = "Press Voice Control and say a command...";
            }
        });
    }
}

/* =========================================================
   UI THEMING & NAVIGATION TABS
========================================================= */
function initTheme() {
    const themeBtn = document.getElementById("theme-toggle");
    if (!themeBtn) return;

    themeBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const nextTheme = currentTheme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", nextTheme);
        
        const icon = document.getElementById("theme-icon");
        if (icon) {
            icon.className = nextTheme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon";
        }
    });
}

function initSidebar() {
    const toggleBtn = document.getElementById("sidebar-toggle");
    const sidebar = document.getElementById("sidebar");

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            if (map) setTimeout(() => map.invalidateSize(), 300);
        });
    }

    // View Switching Navigation
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            const targetId = item.getAttribute("data-target");
            const dashboardSec = document.getElementById("dashboard-section");
            const databaseSec = document.getElementById("database-section");

            if (targetId === "database-section") {
                dashboardSec.classList.add("hidden");
                databaseSec.classList.remove("hidden");
            } else {
                databaseSec.classList.add("hidden");
                dashboardSec.classList.remove("hidden");
                
                if (targetId) {
                    const el = document.getElementById(targetId);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }
            }

            if (map) setTimeout(() => map.invalidateSize(), 300);
        });
    });
}

/* =========================================================
   NOTIFICATION TOAST SYSTEM
========================================================= */
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}