/* =========================================================
   AI THERMAL EVENT INTELLIGENCE DASHBOARD
   FRONTEND CONTROLLER
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let allEvents = [];

let filteredEvents = [];

let markersLayer;

let map;

let alerts = [];

const ALERT_THRESHOLDS = {
    critical: 85,
    high: 70,
    monitor: 50
};


/*
   BACKEND / DATA PATHS
*/

const DATA_PATHS = [
    "predictions.csv",
    "./predictions.csv",
    "data/predictions.csv",
    "./data/predictions.csv",
    "frontend/predictions.csv",
    "./frontend/predictions.csv"
];


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeMap();

    setupEventListeners();

    setupPredictionForm();

    loadPredictionData();

});


/* =========================================================
   MAP INITIALIZATION
========================================================= */

function initializeMap() {

    const mapElement = document.getElementById("map");

    if (!mapElement) {
        console.warn("Map element not found.");
        return;
    }

    map = L.map("map", {
        zoomControl: true,
        minZoom: 2,
        worldCopyJump: true
    }).setView([20, 78], 4);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }
    ).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}


/* =========================================================
   LOAD PREDICTION DATA
========================================================= */

async function loadPredictionData() {

    let loaded = false;

    for (const path of DATA_PATHS) {

        try {

            const response = await fetch(path);

            if (!response.ok) {
                continue;
            }

            const csvText = await response.text();

            if (!csvText.trim()) {
                continue;
            }

            processData(csvText);

            loaded = true;

            console.log(
                "Prediction data loaded from:",
                path
            );

            break;

        } catch (error) {

            console.warn(
                "Unable to load:",
                path
            );

        }

    }

    if (!loaded) {

        showDataError(
            "Unable to load predictions.csv. " +
            "Make sure the file is inside the frontend folder."
        );

    }
}


/* =========================================================
   FALLBACK PATH LOADER
========================================================= */

async function tryNextPath(paths, index = 0) {

    if (index >= paths.length) {
        return false;
    }

    try {

        const response = await fetch(paths[index]);

        if (!response.ok) {
            return tryNextPath(paths, index + 1);
        }

        const text = await response.text();

        if (!text.trim()) {
            return tryNextPath(paths, index + 1);
        }

        processData(text);

        return true;

    } catch (error) {

        return tryNextPath(paths, index + 1);

    }
}


/* =========================================================
   CSV PROCESSING
========================================================= */

function processData(csvText) {

    const rows = parseCSV(csvText);

    if (!rows.length) {

        showDataError(
            "No prediction records were found."
        );

        return;
    }

    allEvents = rows
        .map(normalizeEvent)
        .filter(isValidEvent);

    filteredEvents = [...allEvents];

    updateDashboard();

    populateLandCoverFilter();

    applyFilters();

    updateAlerts(allEvents);

}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {

            value += '"';

            i++;

            continue;
        }

        if (char === '"') {

            insideQuotes = !insideQuotes;

            continue;
        }

        if (char === "," && !insideQuotes) {

            row.push(value.trim());

            value = "";

            continue;
        }

        if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {
                i++;
            }

            row.push(value.trim());

            value = "";

            if (
                row.length &&
                row.some(cell => cell !== "")
            ) {
                rows.push(row);
            }

            row = [];

            continue;
        }

        value += char;
    }

    if (value.length || row.length) {

        row.push(value.trim());

        if (
            row.length &&
            row.some(cell => cell !== "")
        ) {
            rows.push(row);
        }
    }

    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0].map(
        header =>
            header
                .trim()
                .replace(/^"|"$/g, "")
    );

    return rows.slice(1).map(values => {

        const object = {};

        headers.forEach((header, index) => {

            object[header] =
                values[index] !== undefined
                    ? values[index]
                    : "";

        });

        return object;

    });
}


/* =========================================================
   NORMALIZE EVENT
========================================================= */

function normalizeEvent(raw) {

    return {

        ...raw,

        event_id:
            getValue(
                raw,
                [
                    "event_id",
                    "eventId",
                    "id",
                    "source_id"
                ]
            ),

        latitude:
            parseNumber(
                getValue(
                    raw,
                    [
                        "latitude",
                        "lat"
                    ]
                )
            ),

        longitude:
            parseNumber(
                getValue(
                    raw,
                    [
                        "longitude",
                        "lon",
                        "lng"
                    ]
                )
            ),

        event_type:
            getValue(
                raw,
                [
                    "event_type",
                    "eventType",
                    "classification",
                    "predicted_class",
                    "prediction",
                    "type"
                ]
            ) || "Unknown",

        confidence:
            safeConfidence(raw),

        mean_frp:
            parseNumber(
                getValue(
                    raw,
                    [
                        "mean_frp",
                        "mean_frp_mw"
                    ]
                )
            ),

        max_frp:
            parseNumber(
                getValue(
                    raw,
                    [
                        "max_frp",
                        "max_frp_mw"
                    ]
                )
            ),

        mean_brightness:
            parseNumber(
                getValue(
                    raw,
                    [
                        "mean_brightness"
                    ]
                )
            ),

        max_brightness:
            parseNumber(
                getValue(
                    raw,
                    [
                        "max_brightness"
                    ]
                )
            ),

        distance_to_industry:
            parseNumber(
                getValue(
                    raw,
                    [
                        "mean_distance_to_industry_km",
                        "mean_distance_industry_km",
                        "distance_to_nearest_industry_km"
                    ]
                )
            ),

        min_distance_to_industry:
            parseNumber(
                getValue(
                    raw,
                    [
                        "min_distance_to_industry_km",
                        "min_distance_industry_km"
                    ]
                )
            ),

        facilities_1km:
            parseNumber(
                getValue(
                    raw,
                    [
                        "mean_industrial_facilities_1km",
                        "number_of_industrial_facilities_1km"
                    ]
                )
            ),

        facilities_5km:
            parseNumber(
                getValue(
                    raw,
                    [
                        "mean_industrial_facilities_5km",
                        "number_of_industrial_facilities_5km"
                    ]
                )
            ),

        industrial_land_ratio:
            parseNumber(
                getValue(
                    raw,
                    [
                        "industrial_land_ratio"
                    ]
                )
            ),

        nearest_facility_type:
            getValue(
                raw,
                [
                    "nearest_facility_type"
                ]
            ),

        nearest_refinery_km:
            parseNumber(
                getValue(
                    raw,
                    [
                        "nearest_refinery_km"
                    ]
                )
            ),

        nearest_powerplant_km:
            parseNumber(
                getValue(
                    raw,
                    [
                        "nearest_powerplant_km"
                    ]
                )
            ),

        nearest_mine_km:
            parseNumber(
                getValue(
                    raw,
                    [
                        "nearest_mine_km"
                    ]
                )
            ),

        nearest_industrial_area_km:
            parseNumber(
                getValue(
                    raw,
                    [
                        "nearest_industrial_area_km"
                    ]
                )
            ),

        landcover_code:
            getValue(
                raw,
                [
                    "landcover_code"
                ]
            ),

        landcover_class:
            getValue(
                raw,
                [
                    "landcover_class",
                    "landcover"
                ]
            ),

        total_detections:
            parseNumber(
                getValue(
                    raw,
                    [
                        "total_detections"
                    ]
                )
            ),

        active_days:
            parseNumber(
                getValue(
                    raw,
                    [
                        "active_days"
                    ]
                )
            ),

        observation_span_days:
            parseNumber(
                getValue(
                    raw,
                    [
                        "observation_span_days"
                    ]
                )
            ),

        recurrence_rate:
            parseNumber(
                getValue(
                    raw,
                    [
                        "recurrence_rate"
                    ]
                )
            ),

        detections_per_span_day:
            parseNumber(
                getValue(
                    raw,
                    [
                        "detections_per_span_day"
                    ]
                )
            ),

        mean_gap_hours:
            parseNumber(
                getValue(
                    raw,
                    [
                        "mean_gap_hours"
                    ]
                )
            ),

        std_gap_hours:
            parseNumber(
                getValue(
                    raw,
                    [
                        "std_gap_hours"
                    ]
                )
            ),

        median_gap_hours:
            parseNumber(
                getValue(
                    raw,
                    [
                        "median_gap_hours"
                    ]
                )
            ),

        min_gap_hours:
            parseNumber(
                getValue(
                    raw,
                    [
                        "min_gap_hours"
                    ]
                )
            ),

        max_gap_hours:
            parseNumber(
                getValue(
                    raw,
                    [
                        "max_gap_hours"
                    ]
                )
            ),

        temporal_regularity:
            parseNumber(
                getValue(
                    raw,
                    [
                        "temporal_regularity"
                    ]
                )
            ),

        max_active_days_7d:
            parseNumber(
                getValue(
                    raw,
                    [
                        "max_active_days_7d"
                    ]
                )
            ),

        max_active_days_14d:
            parseNumber(
                getValue(
                    raw,
                    [
                        "max_active_days_14d"
                    ]
                )
            ),

        max_active_days_30d:
            parseNumber(
                getValue(
                    raw,
                    [
                        "max_active_days_30d"
                    ]
                )
            ),

        observation_days:
            parseNumber(
                getValue(
                    raw,
                    [
                        "observation_days"
                    ]
                )
            ),

        acq_date:
            getValue(
                raw,
                [
                    "acq_date",
                    "date"
                ]
            ),

        acq_time_utc:
            getValue(
                raw,
                [
                    "acq_time_utc",
                    "time"
                ]
            )
    };
}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(object, keys) {

    for (const key of keys) {

        if (
            object[key] !== undefined &&
            object[key] !== null &&
            String(object[key]).trim() !== ""
        ) {

            return object[key];

        }
    }

    return "";
}


/* =========================================================
   NUMBER PARSER
========================================================= */

function parseNumber(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return NaN;
    }

    const cleaned =
        String(value)
            .replace("%", "")
            .replace(/,/g, "")
            .trim();

    const number = Number(cleaned);

    return Number.isFinite(number)
        ? number
        : NaN;
}


/* =========================================================
   EVENT VALIDATION
========================================================= */

function isValidEvent(event) {

    return (
        Number.isFinite(event.latitude) &&
        Number.isFinite(event.longitude)
    );
}


/* =========================================================
   SET TEXT
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.textContent =
        value === undefined ||
        value === null ||
        value === ""
            ? "—"
            : value;
}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {

    const total =
        allEvents.length;

    const industrial =
        allEvents.filter(
            event =>
                normalizeType(event.event_type)
                === "industrial"
        ).length;

    const forest =
        allEvents.filter(
            event =>
                normalizeType(event.event_type)
                === "forest"
        ).length;

    const natural =
        allEvents.filter(
            event =>
                normalizeType(event.event_type)
                === "natural"
        ).length;

    setText("totalEvents", total);

    setText(
        "industrialEvents",
        industrial
    );

    setText(
        "forestEvents",
        forest
    );

    setText(
        "naturalEvents",
        natural
    );

    setText(
        "eventCount",
        total
    );

    setText(
        "totalCount",
        total
    );

}


/* =========================================================
   NORMALIZE EVENT TYPE
========================================================= */

function normalizeType(type) {

    const value =
        String(type || "")
            .toLowerCase()
            .trim();

    if (
        value.includes("industrial")
    ) {
        return "industrial";
    }

    if (
        value.includes("forest")
    ) {
        return "forest";
    }

    if (
        value.includes("natural")
    ) {
        return "natural";
    }

    if (
        value.includes("agric")
    ) {
        return "agriculture";
    }

    if (
        value.includes("persistent")
    ) {
        return "persistent";
    }

    return value;
}


/* =========================================================
   LAND COVER FILTER
========================================================= */

function populateLandCoverFilter() {

    const select =
        document.getElementById(
            "landcoverFilter"
        );

    if (!select) return;

    const classes =
        [
            ...new Set(
                allEvents
                    .map(
                        event =>
                            event.landcover_class
                    )
                    .filter(Boolean)
            )
        ]
        .sort();

    select.innerHTML =
        `<option value="all">All Land Cover</option>`;

    classes.forEach(
        landcover => {

            const option =
                document.createElement("option");

            option.value =
                landcover;

            option.textContent =
                landcover;

            select.appendChild(option);

        }
    );
}


/* =========================================================
   FILTER EVENTS
========================================================= */

function applyFilters() {

    const typeFilter =
        document.getElementById(
            "eventTypeFilter"
        );

    const confidenceFilter =
        document.getElementById(
            "confidenceFilter"
        );

    const landcoverFilter =
        document.getElementById(
            "landcoverFilter"
        );

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const selectedType =
        typeFilter
            ? typeFilter.value
            : "all";

    const selectedLandcover =
        landcoverFilter
            ? landcoverFilter.value
            : "all";

    const minConfidence =
        confidenceFilter
            ? Number(confidenceFilter.value || 0)
            : 0;

    const search =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";

    filteredEvents =
        allEvents.filter(event => {

            const matchesType =
                selectedType === "all" ||
                normalizeType(
                    event.event_type
                ) === normalizeType(
                    selectedType
                );

            const matchesLandcover =
                selectedLandcover === "all" ||
                event.landcover_class ===
                    selectedLandcover;

            const matchesConfidence =
                !Number.isFinite(
                    event.confidence
                ) ||
                event.confidence >=
                    minConfidence;

            const searchable =
                [
                    event.event_id,
                    event.event_type,
                    event.landcover_class,
                    event.nearest_facility_type
                ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !search ||
                searchable.includes(search);

            return (
                matchesType &&
                matchesLandcover &&
                matchesConfidence &&
                matchesSearch
            );

        });

    renderMarkers();

    renderTable();

    setText(
        "visibleCount",
        filteredEvents.length
    );

}


/* =========================================================
   RENDER MAP MARKERS
========================================================= */

function renderMarkers() {

    if (!markersLayer) return;

    markersLayer.clearLayers();

    filteredEvents.forEach(event => {

        const color =
            getEventColor(
                event.event_type
            );

        const marker =
            L.circleMarker(
                [
                    event.latitude,
                    event.longitude
                ],
                {
                    radius: 7,
                    weight: 2,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.75
                }
            );

        marker.bindPopup(
            createPopup(event)
        );

        marker.on(
            "click",
            () => {
                showEventDetails(event);
            }
        );

        marker.addTo(
            markersLayer
        );

    });

}


/* =========================================================
   ALERT SYSTEM
========================================================= */

function getAlertLevel(confidence) {

    const score =
        Number(confidence) || 0;

    if (
        score >=
        ALERT_THRESHOLDS.critical
    ) {

        return {
            level: "CRITICAL",
            className: "critical",
            icon: "🚨",
            message:
                "High-confidence thermal event detected"
        };

    }

    if (
        score >=
        ALERT_THRESHOLDS.high
    ) {

        return {
            level: "HIGH",
            className: "high",
            icon: "⚠️",
            message:
                "High-confidence event requires attention"
        };

    }

    if (
        score >=
        ALERT_THRESHOLDS.monitor
    ) {

        return {
            level: "MONITOR",
            className: "monitor",
            icon: "👁️",
            message:
                "Event should be monitored"
        };

    }

    return {
        level: "LOW RISK",
        className: "low",
        icon: "✓",
        message:
            "Low-confidence event"
    };

}


/* =========================================================
   ALERT LABEL
========================================================= */

function getAlertLabel(confidence) {

    return getAlertLevel(
        confidence
    ).level;

}


/* =========================================================
   ALERT ICON
========================================================= */

function getAlertIcon(confidence) {

    return getAlertLevel(
        confidence
    ).icon;

}


/* =========================================================
   UPDATE ALERTS
========================================================= */

function updateAlerts(events) {

    alerts = [];

    events.forEach(
        (event, index) => {

            const confidence =
                safeConfidence(event);

            const alert =
                getAlertLevel(
                    confidence
                );

            if (
                alert.level !==
                "LOW RISK"
            ) {

                alerts.push({

                    id:
                        event.event_id ||
                        event.eventId ||
                        index,

                    event: event,

                    confidence:
                        confidence,

                    level:
                        alert.level,

                    className:
                        alert.className,

                    icon:
                        alert.icon,

                    message:
                        alert.message

                });

            }

        }
    );

    updateAlertCount();

    renderAlertList();

}


/* =========================================================
   UPDATE ALERT COUNT
========================================================= */

function updateAlertCount() {

    const alertCount =
        document.getElementById(
            "alertCount"
        );

    if (!alertCount) return;

    alertCount.textContent =
        alerts.length;

    if (
        alerts.length === 0
    ) {

        alertCount.style.display =
            "none";

    } else {

        alertCount.style.display =
            "inline-flex";

    }

}


/* =========================================================
   RENDER ALERT LIST
========================================================= */

function renderAlertList() {

    const alertList =
        document.getElementById(
            "alertList"
        );

    if (!alertList) return;

    const critical =
        alerts.filter(
            alert =>
                alert.level ===
                "CRITICAL"
        ).length;

    const high =
        alerts.filter(
            alert =>
                alert.level ===
                "HIGH"
        ).length;

    const monitor =
        alerts.filter(
            alert =>
                alert.level ===
                "MONITOR"
        ).length;

    setText(
        "criticalAlertCount",
        critical
    );

    setText(
        "highAlertCount",
        high
    );

    setText(
        "monitorAlertCount",
        monitor
    );

    if (
        alerts.length === 0
    ) {

        alertList.innerHTML = `
            <div class="no-alerts">
                <div class="no-alert-icon">✓</div>

                <div>No active alerts</div>

                <small>
                    All detected events are currently
                    below the alert threshold.
                </small>
            </div>
        `;

        return;
    }

    alertList.innerHTML =
        alerts.map(
            alert => {

                const event =
                    alert.event;

                const eventName =
                    event.event_type ||
                    event.type ||
                    event.classification ||
                    "Thermal Event";

                const eventId =
                    event.event_id ||
                    event.eventId ||
                    "Unknown";

                return `
                    <div
                        class="alert-card ${alert.className}"
                    >

                        <div class="alert-card-icon">
                            ${alert.icon}
                        </div>

                        <div class="alert-card-content">

                            <div class="alert-card-header">

                                <strong>
                                    ${alert.level}
                                </strong>

                                <span class="alert-confidence">
                                    ${formatConfidence(
                                        alert.confidence
                                    )}
                                </span>

                            </div>

                            <div class="alert-event-type">
                                ${escapeHTML(
                                    eventName
                                )}
                            </div>

                            <div class="alert-event-id">
                                Event:
                                ${escapeHTML(
                                    String(eventId)
                                )}
                            </div>

                            <div class="alert-message">
                                ${alert.message}
                            </div>

                            <button
                                class="alert-view-button"
                                data-alert-id="${escapeAttribute(
                                    String(alert.id)
                                )}"
                            >
                                View Event
                            </button>

                        </div>

                    </div>
                `;

            }
        ).join("");

    alertList
        .querySelectorAll(
            ".alert-view-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    viewAlertEvent(
                        button.dataset.alertId
                    );

                }
            );

        });

}


/* =========================================================
   TOGGLE ALERT CENTER
========================================================= */

function toggleAlertCenter() {

    const alertCenter =
        document.getElementById(
            "alertCenter"
        );

    if (!alertCenter) return;

    alertCenter.classList.toggle(
        "active"
    );

    renderAlertList();

}


/* =========================================================
   VIEW ALERT EVENT
========================================================= */

function viewAlertEvent(id) {

    const alert =
        alerts.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!alert) return;

    const event =
        alert.event;

    toggleAlertCenter();

    showEventDetails(event);

}


/* =========================================================
   ADD PREDICTION ALERT
========================================================= */

function addPredictionAlert(
    prediction,
    confidence
) {

    const alert =
        getAlertLevel(
            confidence
        );

    const resultBox =
        document.getElementById(
            "predictionResult"
        );

    if (!resultBox) return;

    const existing =
        resultBox.querySelector(
            ".prediction-alert"
        );

    if (existing) {
        existing.remove();
    }

    if (
        alert.level ===
        "LOW RISK"
    ) {
        return;
    }

    const alertElement =
        document.createElement(
            "div"
        );

    alertElement.className =
        `prediction-alert ${alert.className}`;

    alertElement.innerHTML = `
        <span class="prediction-alert-icon">
            ${alert.icon}
        </span>

        <div>
            <strong>
                ${alert.level} ALERT
            </strong>

            <div>
                Confidence:
                ${formatConfidence(
                    confidence
                )}
            </div>

            <small>
                ${alert.message}
            </small>
        </div>
    `;

    resultBox.appendChild(
        alertElement
    );

}


/* =========================================================
   CREATE POPUP
========================================================= */

function createPopup(event) {

    const alert =
        getAlertLevel(
            event.confidence
        );

    return `
        <div class="map-popup">

            <div class="popup-title">
                ${escapeHTML(
                    event.event_type ||
                    "Thermal Event"
                )}
            </div>

            <div class="popup-row">
                <strong>Event ID:</strong>
                ${escapeHTML(
                    String(
                        event.event_id ||
                        "Unknown"
                    )
                )}
            </div>

            <div class="popup-row">
                <strong>Confidence:</strong>
                ${formatConfidence(
                    event.confidence
                )}
            </div>

            <div class="popup-row">
                <strong>Alert:</strong>
                ${alert.icon}
                ${alert.level}
            </div>

            <div class="popup-row">
                <strong>FRP:</strong>
                ${formatNumber(
                    event.max_frp
                )} MW
            </div>

            <div class="popup-row">
                <strong>Land Cover:</strong>
                ${escapeHTML(
                    event.landcover_class ||
                    "—"
                )}
            </div>

            <button
                class="popup-details-button"
                onclick="showEventById('${escapeAttribute(
                    String(event.event_id)
                )}')"
            >
                View Details
            </button>

        </div>
    `;
}


/* =========================================================
   EVENT COLOR
========================================================= */

function getEventColor(type) {

    const normalized =
        normalizeType(type);

    if (
        normalized ===
        "industrial"
    ) {
        return "#ef4444";
    }

    if (
        normalized ===
        "forest"
    ) {
        return "#22c55e";
    }

    if (
        normalized ===
        "natural"
    ) {
        return "#3b82f6";
    }

    if (
        normalized ===
        "agriculture"
    ) {
        return "#f59e0b";
    }

    if (
        normalized ===
        "persistent"
    ) {
        return "#a855f7";
    }

    return "#94a3b8";
}


/* =========================================================
   BADGE CLASS
========================================================= */

function getBadgeClass(type) {

    const normalized =
        normalizeType(type);

    return `badge-${normalized}`;
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderTable() {

    const tableBody =
        document.getElementById(
            "eventTableBody"
        );

    if (!tableBody) return;

    if (
        filteredEvents.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="10">
                    No events found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        filteredEvents.map(
            event => {

                const alert =
                    getAlertLevel(
                        event.confidence
                    );

                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                String(
                                    event.event_id ||
                                    "—"
                                )
                            )}
                        </td>

                        <td>
                            <span
                                class="event-badge ${getBadgeClass(
                                    event.event_type
                                )}"
                            >
                                ${escapeHTML(
                                    event.event_type ||
                                    "Unknown"
                                )}
                            </span>
                        </td>

                        <td>
                            ${formatConfidence(
                                event.confidence
                            )}
                        </td>

                        <td>
                            ${
                                alert.level !==
                                "LOW RISK"
                                    ? `
                                    <span
                                        class="alert-badge ${alert.className}"
                                    >
                                        ${alert.icon}
                                        ${alert.level}
                                    </span>
                                    `
                                    : "—"
                            }
                        </td>

                        <td>
                            ${formatNumber(
                                event.mean_frp
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                event.max_frp
                            )}
                        </td>

                        <td>
                            ${formatDistance(
                                event.distance_to_industry
                            )}
                        </td>

                        <td>
                            ${formatDays(
                                event.observation_span_days
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                event.landcover_class ||
                                "—"
                            )}
                        </td>

                        <td>
                            <button
                                class="table-view-button"
                                data-event-id="${escapeAttribute(
                                    String(
                                        event.event_id
                                    )
                                )}"
                            >
                                View
                            </button>
                        </td>

                    </tr>
                `;

            }
        ).join("");

    tableBody
        .querySelectorAll(
            ".table-view-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showEventById(
                        button.dataset.eventId
                    );

                }
            );

        });

}


/* =========================================================
   SHOW EVENT BY ID
========================================================= */

function showEventById(id) {

    const event =
        allEvents.find(
            item =>
                String(
                    item.event_id
                ) === String(id)
        );

    if (!event) return;

    showEventDetails(event);

}


/* =========================================================
   SHOW EVENT DETAILS
========================================================= */

function showEventDetails(event) {

    if (!event) return;

    const modal =
        document.getElementById(
            "eventModal"
        );

    const modalBody =
        document.getElementById(
            "eventModalBody"
        );

    if (!modal || !modalBody) {

        console.log(
            "Event details:",
            event
        );

        return;
    }

    const alert =
        getAlertLevel(
            event.confidence
        );

    modalBody.innerHTML = `

        <div class="event-detail-header">

            <div>

                <div class="event-detail-title">
                    ${escapeHTML(
                        event.event_type ||
                        "Thermal Event"
                    )}
                </div>

                <div class="event-detail-id">
                    Event ID:
                    ${escapeHTML(
                        String(
                            event.event_id ||
                            "Unknown"
                        )
                    )}
                </div>

            </div>

            <div
                class="event-alert-status ${alert.className}"
            >
                ${alert.icon}
                ${alert.level}
            </div>

        </div>

        <div class="event-detail-grid">

            ${detailItem(
                "Confidence",
                formatConfidence(
                    event.confidence
                )
            )}

            ${detailItem(
                "Latitude",
                formatCoordinate(
                    event.latitude
                )
            )}

            ${detailItem(
                "Longitude",
                formatCoordinate(
                    event.longitude
                )
            )}

            ${detailItem(
                "Mean FRP",
                `${formatNumber(
                    event.mean_frp
                )} MW`
            )}

            ${detailItem(
                "Maximum FRP",
                `${formatNumber(
                    event.max_frp
                )} MW`
            )}

            ${detailItem(
                "Mean Brightness",
                `${formatNumber(
                    event.mean_brightness
                )} K`
            )}

            ${detailItem(
                "Maximum Brightness",
                `${formatNumber(
                    event.max_brightness
                )} K`
            )}

            ${detailItem(
                "Distance to Industry",
                formatDistance(
                    event.distance_to_industry
                )
            )}

            ${detailItem(
                "Minimum Industry Distance",
                formatDistance(
                    event.min_distance_to_industry
                )
            )}

            ${detailItem(
                "Facilities within 1 km",
                formatNumber(
                    event.facilities_1km
                )
            )}

            ${detailItem(
                "Facilities within 5 km",
                formatNumber(
                    event.facilities_5km
                )
            )}

            ${detailItem(
                "Industrial Land Ratio",
                formatNumber(
                    event.industrial_land_ratio
                )
            )}

            ${detailItem(
                "Nearest Facility",
                event.nearest_facility_type
            )}

            ${detailItem(
                "Land Cover",
                event.landcover_class
            )}

            ${detailItem(
                "Total Detections",
                formatNumber(
                    event.total_detections
                )
            )}

            ${detailItem(
                "Active Days",
                formatNumber(
                    event.active_days
                )
            )}

            ${detailItem(
                "Observation Span",
                formatDays(
                    event.observation_span_days
                )
            )}

            ${detailItem(
                "Recurrence Rate",
                formatNumber(
                    event.recurrence_rate
                )
            )}

            ${detailItem(
                "Observation Days",
                formatNumber(
                    event.observation_days
                )
            )}

        </div>

    `;

    modal.classList.remove(
        "hidden"
    );

    modal.classList.add(
        "active"
    );

}


/* =========================================================
   DETAIL ITEM
========================================================= */

function detailItem(
    label,
    value
) {

    return `
        <div class="detail-item">

            <div class="detail-label">
                ${escapeHTML(
                    String(label)
                )}
            </div>

            <div class="detail-value">
                ${escapeHTML(
                    String(
                        value === undefined ||
                        value === null ||
                        value === ""
                            ? "—"
                            : value
                    )
                )}
            </div>

        </div>
    `;
}


/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(value) {

    if (
        value === undefined ||
        value === null ||
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "—";
    }

    return Number(value)
        .toLocaleString(
            undefined,
            {
                maximumFractionDigits: 2
            }
        );
}


/* =========================================================
   FORMAT DISTANCE
========================================================= */

function formatDistance(value) {

    if (
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "—";
    }

    return `${formatNumber(value)} km`;
}


/* =========================================================
   FORMAT DAYS
========================================================= */

function formatDays(value) {

    if (
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "—";
    }

    return `${formatNumber(value)} days`;
}


/* =========================================================
   FORMAT COORDINATE
========================================================= */

function formatCoordinate(value) {

    if (
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "—";
    }

    return Number(value)
        .toFixed(5);
}


/* =========================================================
   FORMAT CONFIDENCE
========================================================= */

function formatConfidence(value) {

    if (
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "—";
    }

    let score =
        Number(value);

    if (
        score >= 0 &&
        score <= 1
    ) {
        score *= 100;
    }

    return `${score.toFixed(1)}%`;
}


/* =========================================================
   SAFE CONFIDENCE
========================================================= */

function safeConfidence(event) {

    if (
        typeof event ===
        "number"
    ) {

        let score =
            Number(event);

        if (
            score >= 0 &&
            score <= 1
        ) {
            score *= 100;
        }

        return score;
    }

    const value =
        getValue(
            event || {},
            [
                "confidence",
                "Confidence",
                "confidence_score",
                "prediction_confidence",
                "probability",
                "score"
            ]
        );

    let score =
        parseNumber(value);

    if (
        !Number.isFinite(score)
    ) {
        return 0;
    }

    if (
        score >= 0 &&
        score <= 1
    ) {
        score *= 100;
    }

    return score;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(value) {

    return escapeHTML(value);
}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {

    const typeFilter =
        document.getElementById(
            "eventTypeFilter"
        );

    const confidenceFilter =
        document.getElementById(
            "confidenceFilter"
        );

    const landcoverFilter =
        document.getElementById(
            "landcoverFilter"
        );

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (typeFilter) {
        typeFilter.value = "all";
    }

    if (confidenceFilter) {
        confidenceFilter.value = "0";
    }

    if (landcoverFilter) {
        landcoverFilter.value = "all";
    }

    if (searchInput) {
        searchInput.value = "";
    }

    applyFilters();

}


/* =========================================================
   DATA ERROR
========================================================= */

function showDataError(message) {

    console.error(
        message
    );

    const errorElement =
        document.getElementById(
            "dataError"
        );

    if (errorElement) {

        errorElement.textContent =
            message;

        errorElement.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    const alertButton =
        document.getElementById(
            "alertButton"
        );

    if (alertButton) {

        alertButton.addEventListener(
            "click",
            toggleAlertCenter
        );

    }


    const closeAlertButton =
        document.getElementById(
            "closeAlertCenter"
        );

    if (closeAlertButton) {

        closeAlertButton.addEventListener(
            "click",
            toggleAlertCenter
        );

    }


    const resetButton =
        document.getElementById(
            "resetFilters"
        );

    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetFilters
        );

    }


    const typeFilter =
        document.getElementById(
            "eventTypeFilter"
        );

    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    const landcoverFilter =
        document.getElementById(
            "landcoverFilter"
        );

    if (landcoverFilter) {

        landcoverFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    const confidenceFilter =
        document.getElementById(
            "confidenceFilter"
        );

    if (confidenceFilter) {

        confidenceFilter.addEventListener(
            "input",
            applyFilters
        );

    }


    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );

    }


    const modal =
        document.getElementById(
            "eventModal"
        );

    const modalClose =
        document.getElementById(
            "closeEventModal"
        );

    if (modalClose) {

        modalClose.addEventListener(
            "click",
            () => {

                if (modal) {

                    modal.classList.add(
                        "hidden"
                    );

                    modal.classList.remove(
                        "active"
                    );

                }

            }
        );

    }

    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    modal.classList.add(
                        "hidden"
                    );

                    modal.classList.remove(
                        "active"
                    );

                }

            }
        );

    }

}


/* =========================================================
   PREDICTION FORM
========================================================= */

function setupPredictionForm() {

    const form =
        document.getElementById(
            "predictionForm"
        );

    if (!form) return;

    form.addEventListener(
        "submit",
        sendPrediction
    );

}


/* =========================================================
   SEND PREDICTION
========================================================= */

async function sendPrediction(
    event
) {

    event.preventDefault();

    const form =
        event.target;

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "ANALYZING...";

    }

    try {

        const formData =
            new FormData(form);

        const payload = {};

        formData.forEach(
            (value, key) => {

                payload[key] =
                    value;

            }
        );

        /*
           Try the backend endpoint.
        */

        const endpoints = [
            "/predict",
            "http://localhost:8000/predict",
            "http://127.0.0.1:8000/predict"
        ];

        let response = null;

        for (
            const endpoint of endpoints
        ) {

            try {

                const result =
                    await fetch(
                        endpoint,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                if (
                    result.ok
                ) {

                    response =
                        result;

                    break;

                }

            } catch (
                endpointError
            ) {

                console.warn(
                    "Prediction endpoint unavailable:",
                    endpoint
                );

            }

        }

        if (!response) {

            throw new Error(
                "Prediction backend is offline."
            );

        }

        const data =
            await response.json();

        displayPredictionResult(
            data
        );

    } catch (error) {

        console.error(
            error
        );

        showPredictionError(
            error.message ||
            "Unable to process prediction."
        );

    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "ANALYZE EVENT";

        }

    }

}


/* =========================================================
   DISPLAY PREDICTION RESULT
========================================================= */

function displayPredictionResult(
    data
) {

    const resultBox =
        document.getElementById(
            "predictionResult"
        );

    if (!resultBox) return;

    const resultType =
        document.getElementById(
            "result-type"
        );

    const resultMessage =
        document.getElementById(
            "result-message"
        );

    const confidenceValue =
        document.getElementById(
            "confidence-value"
        );

    const confidenceFill =
        document.getElementById(
            "confidence-fill"
        );

    const resultIcon =
        document.getElementById(
            "result-icon"
        );

    const prediction =
        data.prediction ||
        data.event_type ||
        data.classification ||
        data.label ||
        "UNKNOWN";

    let confidence =
        safeConfidence(
            data
        );

    if (
        data.confidence !==
        undefined
    ) {

        confidence =
            parseNumber(
                data.confidence
            );

        if (
            confidence >= 0 &&
            confidence <= 1
        ) {
            confidence *= 100;
        }

    }

    if (resultType) {

        resultType.textContent =
            prediction;

    }

    if (resultMessage) {

        resultMessage.textContent =
            getPredictionMessage(
                prediction,
                confidence
            );

    }

    if (confidenceValue) {

        confidenceValue.textContent =
            formatConfidence(
                confidence
            );

    }

    if (confidenceFill) {

        confidenceFill.style.width =
            `${Math.max(
                0,
                Math.min(
                    100,
                    confidence
                )
            )}%`;

    }

    const alert =
        getAlertLevel(
            confidence
        );

    if (resultIcon) {

        resultIcon.textContent =
            alert.icon;

    }

    resultBox.classList.remove(
        "hidden"
    );

    resultBox.classList.add(
        "active"
    );

    addPredictionAlert(
        prediction,
        confidence
    );

}


/* =========================================================
   PREDICTION MESSAGE
========================================================= */

function getPredictionMessage(
    prediction,
    confidence
) {

    const alert =
        getAlertLevel(
            confidence
        );

    return `${prediction} detected with ${formatConfidence(
        confidence
    )} confidence. ${alert.message}.`;
}


/* =========================================================
   PREDICTION ERROR
========================================================= */

function showPredictionError(
    message
) {

    const resultBox =
        document.getElementById(
            "predictionResult"
        );

    if (!resultBox) return;

    const resultType =
        document.getElementById(
            "result-type"
        );

    const resultMessage =
        document.getElementById(
            "result-message"
        );

    const confidenceValue =
        document.getElementById(
            "confidence-value"
        );

    const confidenceFill =
        document.getElementById(
            "confidence-fill"
        );

    const resultIcon =
        document.getElementById(
            "result-icon"
        );

    if (resultType) {

        resultType.textContent =
            "BACKEND OFFLINE";

    }

    if (resultMessage) {

        resultMessage.textContent =
            message;

    }

    if (confidenceValue) {

        confidenceValue.textContent =
            "—";

    }

    if (confidenceFill) {

        confidenceFill.style.width =
            "0%";

    }

    if (resultIcon) {

        resultIcon.textContent =
            "⚠️";

    }

    resultBox.classList.remove(
        "hidden"
    );

}