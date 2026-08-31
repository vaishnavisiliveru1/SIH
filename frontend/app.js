/* =========================================================
   AI THERMAL EVENT INTELLIGENCE DASHBOARD
   FRONTEND CONTROLLER
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let allEvents = [];
let filteredEvents = [];

let map = null;
let markersLayer = null;

let alerts = [];


/* =========================================================
   ALERT RULES

   REQUIRED CONDITION:

   Industrial Fire + confidence >= 80
       => HIGH

   Industrial Fire + confidence >= 60
       => MEDIUM

   Everything else
       => LOW / NO ALERT
========================================================= */

const ALERT_RULES = {
    HIGH: 80,
    MEDIUM: 60
};


/* =========================================================
   BACKEND
========================================================= */

const BACKEND_URL = "http://127.0.0.1:8000/predict";


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeMap();

    loadPredictionData();

    setupEventListeners();

    setupPredictionForm();

});


/* =========================================================
   MAP
========================================================= */

function initializeMap() {

    const mapElement = document.getElementById("map");

    if (!mapElement) {
        console.error("Map element not found.");
        return;
    }

    map = L.map("map", {
        zoomControl: true
    }).setView(
        [20.5937, 78.9629],
        5
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);


    markersLayer = L.layerGroup().addTo(map);

}


/* =========================================================
   CSV LOADING

   IMPORTANT:

   Your index.html and predictions.csv are inside
   frontend/.

   Therefore predictions.csv is the FIRST path.

   Extra paths are kept as fallbacks.
========================================================= */

function loadPredictionData() {

    const possiblePaths = [

        "predictions.csv",

        "./predictions.csv",

        "frontend/predictions.csv",

        "static/predictions.csv",

        "./static/predictions.csv",

        "data/predictions.csv",

        "./data/predictions.csv"

    ];


    tryNextCSVPath(
        possiblePaths,
        0
    );

}


/* =========================================================
   TRY CSV PATH
========================================================= */

function tryNextCSVPath(paths, index) {

    if (index >= paths.length) {

        showDataError();

        return;

    }


    const path = paths[index];

    console.log(
        "Trying CSV:",
        path
    );


    Papa.parse(
        path,
        {

            download: true,

            header: true,

            skipEmptyLines: true,

            dynamicTyping: false,


            complete: function(results) {

                if (
                    results.errors &&
                    results.errors.length > 0
                ) {

                    console.warn(
                        "CSV error:",
                        path,
                        results.errors
                    );

                    tryNextCSVPath(
                        paths,
                        index + 1
                    );

                    return;

                }


                if (
                    !results.data ||
                    results.data.length === 0
                ) {

                    tryNextCSVPath(
                        paths,
                        index + 1
                    );

                    return;

                }


                console.log(
                    "CSV loaded successfully:",
                    path
                );


                processData(
                    results.data
                );

            },


            error: function(error) {

                console.warn(
                    "Could not load:",
                    path,
                    error
                );


                tryNextCSVPath(
                    paths,
                    index + 1
                );

            }

        }
    );

}


/* =========================================================
   PROCESS DATA
========================================================= */

function processData(data) {

    allEvents = data
        .map(normalizeEvent)
        .filter(isValidEvent);


    filteredEvents = [
        ...allEvents
    ];


    console.log(
        "Total valid events:",
        allEvents.length
    );


    console.log(
        "First event:",
        allEvents[0]
    );


    populateLandCoverFilter();

    updateDashboard();

    renderMarkers();

    renderTable();

    updateAlerts();

}


/* =========================================================
   NORMALIZE EVENT
========================================================= */

function normalizeEvent(row) {

    const event = {};


    /*
        Preserve every original CSV field.
    */

    Object.keys(row).forEach(key => {

        event[key] = row[key];

    });


    /* SOURCE ID */

    event.source_id = getValue(
        row,
        [
            "source_id",
            "SOURCE_ID",
            "Source_ID",
            "sourceId",
            "SOURCEID"
        ]
    );


    /* EVENT TYPE */

    event.predicted_event_type = getValue(
        row,
        [
            "predicted_event_type",
            "event_type",
            "classification",
            "predicted_type",
            "prediction"
        ]
    );


    if (!event.predicted_event_type) {

        event.predicted_event_type =
            "Other";

    }


    /* =====================================================
        CONFIDENCE

        IMPORTANT:

        DO NOT use || 0.

        Missing confidence = null.

        This prevents a missing value from being
        falsely displayed as 0%.
    ===================================================== */

    event.confidence = parseConfidence(
        getValue(
            row,
            [
                "confidence_pct",
                "confidence",
                "prediction_confidence",
                "confidence_score",
                "model_confidence",
                "confidence_percent",
                "prediction_probability",
                "probability",
                "probability_score",
                "Confidence",
                "CONFIDENCE"
            ]
        )
    );


    /* LATITUDE */

    event.latitude = parseNumber(
        getValue(
            row,
            [
                "latitude",
                "lat",
                "LATITUDE",
                "Latitude"
            ]
        )
    );


    /* LONGITUDE */

    event.longitude = parseNumber(
        getValue(
            row,
            [
                "longitude",
                "lon",
                "LONGITUDE",
                "Longitude"
            ]
        )
    );


    /* LAND COVER */

    event.landcover = getValue(
        row,
        [
            "landcover_class",
            "land_cover",
            "landcover",
            "land_cover_class",
            "Landcover"
        ]
    );


    if (!event.landcover) {
        event.landcover = "Unknown";
    }


    /* M1 */

    event.mean_frp = parseNumber(
        getValue(
            row,
            [
                "mean_frp",
                "mean_frp_mw"
            ]
        )
    );


    event.max_frp = parseNumber(
        getValue(
            row,
            [
                "max_frp",
                "max_frp_mw"
            ]
        )
    );


    event.mean_brightness = parseNumber(
        getValue(
            row,
            [
                "mean_brightness"
            ]
        )
    );


    event.max_brightness = parseNumber(
        getValue(
            row,
            [
                "max_brightness"
            ]
        )
    );


    /* M2 */

    event.mean_distance_industry =
        parseNumber(
            getValue(
                row,
                [
                    "mean_distance_to_industry_km",
                    "mean_distance_industry"
                ]
            )
        );


    event.min_distance_industry =
        parseNumber(
            getValue(
                row,
                [
                    "min_distance_to_industry_km",
                    "min_distance_industry"
                ]
            )
        );


    event.facilities_1km =
        parseNumber(
            getValue(
                row,
                [
                    "mean_industrial_facilities_1km",
                    "number_of_industrial_facilities_1km"
                ]
            )
        );


    event.facilities_5km =
        parseNumber(
            getValue(
                row,
                [
                    "mean_industrial_facilities_5km",
                    "number_of_industrial_facilities_5km"
                ]
            )
        );


    event.nearest_facility_type =
        getValue(
            row,
            [
                "nearest_facility_type"
            ]
        ) || "N/A";


    event.nearest_refinery =
        parseNumber(
            getValue(
                row,
                [
                    "nearest_refinery_km"
                ]
            )
        );


    event.nearest_powerplant =
        parseNumber(
            getValue(
                row,
                [
                    "nearest_powerplant_km"
                ]
            )
        );


    event.nearest_mine =
        parseNumber(
            getValue(
                row,
                [
                    "nearest_mine_km"
                ]
            )
        );


    event.nearest_industrial_area =
        parseNumber(
            getValue(
                row,
                [
                    "nearest_industrial_area_km"
                ]
            )
        );


    /* M4 */

    event.total_detections =
        parseNumber(
            getValue(
                row,
                [
                    "total_detections"
                ]
            )
        );


    event.active_days =
        parseNumber(
            getValue(
                row,
                [
                    "active_days"
                ]
            )
        );


    event.observation_span_days =
        parseNumber(
            getValue(
                row,
                [
                    "observation_span_days"
                ]
            )
        );


    event.recurrence_rate =
        parseNumber(
            getValue(
                row,
                [
                    "recurrence_rate"
                ]
            )
        );


    event.temporal_regularity =
        parseNumber(
            getValue(
                row,
                [
                    "temporal_regularity"
                ]
            )
        );


    return event;

}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(row, names) {

    for (const name of names) {

        if (
            Object.prototype.hasOwnProperty.call(
                row,
                name
            )
        ) {

            const value = row[name];

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {

                return String(value).trim();

            }

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
        String(value).trim() === ""
    ) {

        return null;

    }


    const cleaned = String(value)
        .replace(/,/g, "")
        .trim();


    const number = Number(cleaned);


    if (Number.isFinite(number)) {

        return number;

    }


    return null;

}


/* =========================================================
   CONFIDENCE PARSER

   Handles:

   0.91        -> 91
   91          -> 91
   "91%"       -> 91
   "0.91%"     -> 0.91

   Missing -> null

   NEVER -> 0
========================================================= */

function parseConfidence(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }


    let text = String(value)
        .trim();


    if (text === "") {

        return null;

    }


    const hasPercent =
        text.includes("%");


    text = text
        .replace(/%/g, "")
        .replace(/,/g, "")
        .trim();


    let number = Number(text);


    if (!Number.isFinite(number)) {

        return null;

    }


    /*
        If the value is a probability between 0 and 1,
        convert it to percentage.
    */

    if (
        number >= 0 &&
        number <= 1 &&
        !hasPercent
    ) {

        number *= 100;

    }


    /*
        Keep confidence within 0–100.
    */

    number = Math.max(
        0,
        Math.min(
            100,
            number
        )
    );


    return number;

}


/* =========================================================
   VALID EVENT
========================================================= */

function isValidEvent(event) {

    return (
        event.source_id &&
        Number.isFinite(event.latitude) &&
        Number.isFinite(event.longitude)
    );

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

    const total =
        filteredEvents.length;


    const industrial =
        filteredEvents.filter(
            event =>
                normalizeType(
                    event.predicted_event_type
                ) === "Industrial"
        ).length;


    const forest =
        filteredEvents.filter(
            event =>
                normalizeType(
                    event.predicted_event_type
                ) === "Forest/Natural"
        ).length;


    const agricultural =
        filteredEvents.filter(
            event =>
                normalizeType(
                    event.predicted_event_type
                ) === "Agricultural"
        ).length;


    const other =
        filteredEvents.filter(
            event =>
                normalizeType(
                    event.predicted_event_type
                ) === "Other"
        ).length;


    setText(
        "total-sources",
        total
    );


    setText(
        "industrial-count",
        industrial
    );


    setText(
        "forest-count",
        forest
    );


    setText(
        "agricultural-count",
        agricultural
    );


    setText(
        "other-count",
        other
    );


    setText(
        "visible-count",
        `${total} EVENTS`
    );

}


/* =========================================================
   TYPE NORMALIZATION
========================================================= */

function normalizeType(type) {

    if (!type) {

        return "Other";

    }


    const value =
        String(type)
            .trim()
            .toLowerCase();


    if (
        value.includes("industrial")
    ) {

        return "Industrial";

    }


    if (
        value.includes("forest") ||
        value.includes("natural")
    ) {

        return "Forest/Natural";

    }


    if (
        value.includes("agricultural") ||
        value.includes("agriculture")
    ) {

        return "Agricultural";

    }


    return "Other";

}


/* =========================================================
   LAND COVER FILTER
========================================================= */

function populateLandCoverFilter() {

    const select =
        document.getElementById(
            "landcover-filter"
        );


    if (!select) return;


    select.innerHTML = `
        <option value="ALL">
            All Land Covers
        </option>
    `;


    const values = [
        ...new Set(
            allEvents
                .map(event => event.landcover)
                .filter(
                    value =>
                        value &&
                        value !== "Unknown"
                )
        )
    ].sort();


    values.forEach(value => {

        const option =
            document.createElement(
                "option"
            );


        option.value = value;

        option.textContent = value;


        select.appendChild(
            option
        );

    });

}


/* =========================================================
   FILTERS
========================================================= */

function applyFilters() {

    const type =
        document.getElementById(
            "type-filter"
        ).value;


    const search =
        document.getElementById(
            "search-input"
        ).value
            .trim()
            .toLowerCase();


    const landcover =
        document.getElementById(
            "landcover-filter"
        ).value;


    const minimumConfidence =
        Number(
            document.getElementById(
                "confidence-filter"
            ).value
        );


    filteredEvents =
        allEvents.filter(event => {


            const normalizedType =
                normalizeType(
                    event.predicted_event_type
                );


            const matchesType =
                type === "ALL" ||
                normalizedType === type;


            const matchesSearch =
                !search ||
                event.source_id
                    .toLowerCase()
                    .includes(search);


            const matchesLandcover =
                landcover === "ALL" ||
                event.landcover === landcover;


            /*
                IMPORTANT:

                Missing confidence should NOT be treated
                as 0 automatically.

                When a confidence filter greater than 0
                is selected, events without confidence
                are excluded.

                With "Any Confidence", they remain visible.
            */

            const matchesConfidence =
                minimumConfidence === 0
                    ? true
                    : (
                        Number.isFinite(
                            event.confidence
                        ) &&
                        event.confidence >=
                            minimumConfidence
                    );


            return (
                matchesType &&
                matchesSearch &&
                matchesLandcover &&
                matchesConfidence
            );

        });


    updateDashboard();

    renderMarkers();

    renderTable();

}


/* =========================================================
   MAP MARKERS
========================================================= */

function renderMarkers() {

    if (!markersLayer) return;


    markersLayer.clearLayers();


    const bounds = [];


    filteredEvents.forEach(event => {

        const type =
            normalizeType(
                event.predicted_event_type
            );


        const marker =
            L.circleMarker(
                [
                    event.latitude,
                    event.longitude
                ],
                {

                    radius: 7,

                    fillColor:
                        getEventColor(type),

                    color: "#ffffff",

                    weight: 1,

                    opacity: 0.9,

                    fillOpacity: 0.85

                }
            );


        marker.bindPopup(
            createPopup(event)
        );


        marker.on(
            "click",
            () => {

                showEventDetails(
                    event
                );

            }
        );


        marker.addTo(
            markersLayer
        );


        bounds.push(
            [
                event.latitude,
                event.longitude
            ]
        );

    });


    if (
        bounds.length > 0
    ) {

        map.fitBounds(
            bounds,
            {
                padding: [
                    30,
                    30
                ],
                maxZoom: 10
            }
        );

    }

}


/* =========================================================
   EVENT COLOR
========================================================= */

function getEventColor(type) {

    switch (type) {

        case "Industrial":
            return "#ff4d5a";

        case "Forest/Natural":
            return "#22c55e";

        case "Agricultural":
            return "#f59e0b";

        default:
            return "#94a3b8";

    }

}


/* =========================================================
   BADGE
========================================================= */

function getBadgeClass(type) {

    switch (type) {

        case "Industrial":
            return "badge-industrial";

        case "Forest/Natural":
            return "badge-forest";

        case "Agricultural":
            return "badge-agricultural";

        default:
            return "badge-other";

    }

}


/* =========================================================
   TABLE
========================================================= */

function renderTable() {

    const tbody =
        document.getElementById(
            "table-body"
        );


    if (!tbody) return;


    tbody.innerHTML = "";


    if (
        filteredEvents.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty-table"
                >

                    No thermal sources match
                    the selected filters.

                </td>

            </tr>

        `;

        return;

    }


    filteredEvents.forEach(event => {

        const row =
            document.createElement(
                "tr"
            );


        const type =
            normalizeType(
                event.predicted_event_type
            );


        const viewButton =
            document.createElement(
                "button"
            );


        viewButton.type = "button";

        viewButton.className =
            "view-button";

        viewButton.textContent =
            "VIEW";


        /*
            IMPORTANT:

            Use addEventListener instead of
            inline onclick.

            This makes VIEW reliable.
        */

        viewButton.addEventListener(
            "click",
            function(e) {

                e.stopPropagation();

                showEventDetails(
                    event
                );

            }
        );


        const actionCell =
            document.createElement(
                "td"
            );


        actionCell.appendChild(
            viewButton
        );


        row.innerHTML = `

            <td>

                <span class="source-id">

                    ${escapeHTML(
                        event.source_id
                    )}

                </span>

            </td>


            <td>

                <span class="
                    event-badge
                    ${getBadgeClass(type)}
                ">

                    ${escapeHTML(type)}

                </span>

            </td>


            <td>

                <span class="confidence-text">

                    ${formatConfidence(
                        event.confidence
                    )}

                </span>

            </td>


            <td>

                ${formatCoordinate(
                    event.latitude
                )}

            </td>


            <td>

                ${formatCoordinate(
                    event.longitude
                )}

            </td>


            <td>

                ${escapeHTML(
                    event.landcover
                )}

            </td>


            <td>

                ${formatNumber(
                    event.mean_frp
                )}

            </td>


            <td>

                ${
                    Number.isFinite(
                        event.active_days
                    )
                    ?
                    `${formatNumber(
                        event.active_days
                    )} days`
                    :
                    "—"
                }

            </td>

        `;


        row.appendChild(
            actionCell
        );


        /*
            Clicking anywhere on the row
            except VIEW opens details.
        */

        row.addEventListener(
            "click",
            function() {

                showEventDetails(
                    event
                );

            }
        );


        tbody.appendChild(
            row
        );

    });

}


/* =========================================================
   VIEW EVENT
========================================================= */

function showEventById(sourceId) {

    const event =
        allEvents.find(
            e =>
                String(e.source_id) ===
                String(sourceId)
        );


    if (event) {

        showEventDetails(
            event
        );

    }

}


/* =========================================================
   EVENT DETAILS
========================================================= */

function showEventDetails(event) {

    const container =
        document.getElementById(
            "details-content"
        );


    const sourceLabel =
        document.getElementById(
            "selected-source-label"
        );


    if (!container) return;


    if (sourceLabel) {

        sourceLabel.textContent =
            event.source_id;

    }


    const type =
        normalizeType(
            event.predicted_event_type
        );


    const color =
        getEventColor(type);


    const alertLevel =
        getAlertLevel(
            type,
            event.confidence
        );


    container.className =
        "details-content";


    container.innerHTML = `

        <div class="detail-layout">


            <div
                class="classification-box"
                style="--event-color:${color}"
            >

                <div class="classification-label">

                    AI EVENT CLASSIFICATION

                </div>


                <div
                    class="classification-name"
                    style="color:${color}"
                >

                    ${escapeHTML(type)}

                </div>


                <div class="classification-confidence">

                    AI Confidence:

                    <strong>

                        ${formatConfidence(
                            event.confidence
                        )}

                    </strong>

                </div>


                <div class="confidence-track">

                    <div
                        class="confidence-fill"
                        style="
                            width:${confidenceWidth(
                                event.confidence
                            )}%;
                            background:${color};
                        "
                    ></div>

                </div>


                <div class="
                    detail-alert-status
                    ${alertLevel.toLowerCase()}
                ">

                    ${getAlertDisplayText(
                        type,
                        event.confidence
                    )}

                </div>

            </div>


            <div class="detail-grid">


                ${detailItem(
                    "Source ID",
                    event.source_id
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
                    formatNumber(
                        event.mean_frp
                    )
                )}


                ${detailItem(
                    "Maximum FRP",
                    formatNumber(
                        event.max_frp
                    )
                )}


                ${detailItem(
                    "Mean Brightness",
                    formatNumber(
                        event.mean_brightness
                    )
                )}


                ${detailItem(
                    "Maximum Brightness",
                    formatNumber(
                        event.max_brightness
                    )
                )}


                ${detailItem(
                    "Land Cover",
                    event.landcover
                )}


                ${detailItem(
                    "Nearest Facility",
                    event.nearest_facility_type
                )}


                ${detailItem(
                    "Distance to Industry",
                    formatDistance(
                        event.mean_distance_industry
                    )
                )}


                ${detailItem(
                    "Facilities ≤1 km",
                    formatNumber(
                        event.facilities_1km
                    )
                )}


                ${detailItem(
                    "Facilities ≤5 km",
                    formatNumber(
                        event.facilities_5km
                    )
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

            </div>

        </div>

    `;

}


/* =========================================================
   ALERTS CENTER
========================================================= */

function updateAlerts() {

    alerts = filteredEvents
        .map(event => {

            const type =
                normalizeType(
                    event.predicted_event_type
                );

            const level =
                getAlertLevel(
                    type,
                    event.confidence
                );

            return {
                ...event,
                level
            };

        })
        .filter(alert => alert.level !== "none");


    renderAlertCenter();

}


function renderAlertCenter() {

    const criticalCount =
        alerts.filter(
            alert => alert.level === "critical"
        ).length;

    const highCount =
        alerts.filter(
            alert => alert.level === "high"
        ).length;

    const monitorCount =
        alerts.filter(
            alert => alert.level === "monitor"
        ).length;

    const criticalElement =
        document.getElementById(
            "critical-alert-count"
        );

    const highElement =
        document.getElementById(
            "high-alert-count"
        );

    const monitorElement =
        document.getElementById(
            "monitor-alert-count"
        );

    if (criticalElement) {
        criticalElement.textContent =
            criticalCount;
    }

    if (highElement) {
        highElement.textContent =
            highCount;
    }

    if (monitorElement) {
        monitorElement.textContent =
            monitorCount;
    }


    if (alerts.length === 0) {

        const container =
            document.getElementById("alerts-list");

        if (container) {

            container.innerHTML = `
                <div class="no-alerts">
                    No active alerts based on current filters.
                </div>
            `;

        }

        return;

    }

    /* Additional alert rendering logic goes here */

}


/* =========================================================
   HELPER UTILITIES
========================================================= */

function getAlertLevel(type, confidence) {

    if (type !== "Industrial" || !Number.isFinite(confidence)) {
        return "none";
    }

    if (confidence >= ALERT_RULES.HIGH) {
        return "critical";
    }

    if (confidence >= ALERT_RULES.MEDIUM) {
        return "high";
    }

    return "monitor";

}


function getAlertDisplayText(type, confidence) {

    const level = getAlertLevel(type, confidence);

    switch (level) {
        case "critical":
            return "CRITICAL ALERT: High-Confidence Industrial Event";
        case "high":
            return "HIGH ALERT: Medium-Confidence Industrial Event";
        case "monitor":
            return "MONITOR: Low-Confidence Industrial Event";
        default:
            return "NORMAL: No Active Alert";
    }

}


function confidenceWidth(confidence) {

    if (!Number.isFinite(confidence)) return 0;

    return Math.max(0, Math.min(100, confidence));

}


function detailItem(label, value) {

    return `
        <div class="detail-item">
            <span class="detail-label">${escapeHTML(label)}</span>
            <span class="detail-value">${value !== null && value !== undefined && value !== "" ? escapeHTML(String(value)) : "—"}</span>
        </div>
    `;

}


function setText(id, text) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = text;
    }

}


function formatConfidence(confidence) {

    if (!Number.isFinite(confidence)) {
        return "N/A";
    }

    return `${confidence.toFixed(1)}%`;

}


function formatCoordinate(coord) {

    if (!Number.isFinite(coord)) return "—";

    return coord.toFixed(4);

}


function formatNumber(num) {

    if (!Number.isFinite(num)) return "—";

    return num.toLocaleString();

}


function formatDistance(dist) {

    if (!Number.isFinite(dist)) return "—";

    return `${dist.toFixed(2)} km`;

}


function formatDays(days) {

    if (!Number.isFinite(days)) return "—";

    return `${days} days`;

}


function escapeHTML(str) {

    if (str === null || str === undefined) return "";

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function setupEventListeners() {

    const typeFilter = document.getElementById("type-filter");
    const searchInput = document.getElementById("search-input");
    const landcoverFilter = document.getElementById("landcover-filter");
    const confidenceFilter = document.getElementById("confidence-filter");

    if (typeFilter) typeFilter.addEventListener("change", applyFilters);
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (landcoverFilter) landcoverFilter.addEventListener("change", applyFilters);
    if (confidenceFilter) confidenceFilter.addEventListener("change", applyFilters);

}


function setupPredictionForm() {
    /* Form logic placeholder */
}


function showDataError() {

    console.error("Failed to load predictions CSV data.");

}
