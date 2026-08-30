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

   0.91       -> 91
   91         -> 91
   "91%"      -> 91
   "0.91%"    -> 0.91

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


                ${detailItem(
                    "Temporal Regularity",
                    formatNumber(
                        event.temporal_regularity
                    )
                )}

            </div>

        </div>

    `;


    const detailsPanel =
        document.querySelector(
            ".details-panel"
        );


    if (detailsPanel) {

        detailsPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* =========================================================
   DETAIL ITEM
========================================================= */

function detailItem(label, value) {

    return `

        <div class="detail-item">

            <span>
                ${escapeHTML(label)}
            </span>

            <strong>

                ${
                    value === null ||
                    value === undefined ||
                    value === ""
                        ? "—"
                        : escapeHTML(
                            String(value)
                        )
                }

            </strong>

        </div>

    `;

}


/* =========================================================
   ALERT LEVEL

   THIS IS THE EXACT CONDITION YOU REQUESTED.
========================================================= */

function getAlertLevel(
    eventType,
    confidence
) {

    const normalizedType =
        normalizeType(eventType);


    /*
       Missing confidence is NOT LOW.
       It is simply unavailable.

       This prevents false "LOW RISK"
       claims.
    */

    if (
        normalizedType !==
        "Industrial"
    ) {

        return "LOW";

    }


    if (
        !Number.isFinite(
            confidence
        )
    ) {

        return "UNKNOWN";

    }


    if (
        confidence >=
        ALERT_RULES.HIGH
    ) {

        return "HIGH";

    }


    if (
        confidence >=
        ALERT_RULES.MEDIUM
    ) {

        return "MEDIUM";

    }


    return "LOW";

}


/* =========================================================
   ALERT DISPLAY TEXT
========================================================= */

function getAlertDisplayText(
    type,
    confidence
) {

    const level =
        getAlertLevel(
            type,
            confidence
        );


    if (level === "HIGH") {

        return `
            <i class="fa-solid fa-triangle-exclamation"></i>
            HIGH ALERT — Industrial Fire
        `;

    }


    if (level === "MEDIUM") {

        return `
            <i class="fa-solid fa-bell"></i>
            MEDIUM ALERT — Industrial Fire
        `;

    }


    if (level === "UNKNOWN") {

        return `
            <i class="fa-solid fa-circle-question"></i>
            ALERT STATUS UNAVAILABLE — Confidence not provided
        `;

    }


    return `
        <i class="fa-solid fa-circle-check"></i>
        NO INDUSTRIAL FIRE ALERT
    `;

}


/* =========================================================
   UPDATE ALERTS
========================================================= */

function updateAlerts() {

    alerts = [];


    allEvents.forEach(event => {

        const type =
            normalizeType(
                event.predicted_event_type
            );


        const level =
            getAlertLevel(
                type,
                event.confidence
            );


        /*
           ONLY HIGH and MEDIUM Industrial Fire
           events become alerts.
        */

        if (
            level === "HIGH" ||
            level === "MEDIUM"
        ) {

            alerts.push({

                event: event,

                level: level

            });

        }

    });


    /*
       Highest confidence first.
    */

    alerts.sort(
        (a, b) => {

            return (
                b.event.confidence -
                a.event.confidence
            );

        }
    );


    const highCount =
        alerts.filter(
            alert =>
                alert.level === "HIGH"
        ).length;


    const mediumCount =
        alerts.filter(
            alert =>
                alert.level === "MEDIUM"
        ).length;


    const otherCount =
        allEvents.length -
        alerts.length;


    setText(
        "alert-count",
        alerts.length
    );


    setText(
        "high-alert-count",
        highCount
    );


    setText(
        "medium-alert-count",
        mediumCount
    );


    setText(
        "normal-event-count",
        otherCount
    );


    const button =
        document.getElementById(
            "alert-button"
        );


    if (button) {

        button.classList.toggle(
            "has-alert",
            alerts.length > 0
        );

    }


    renderAlertList();

}


/* =========================================================
   ALERT LIST
========================================================= */

function renderAlertList() {

    const list =
        document.getElementById(
            "alert-list"
        );


    if (!list) return;


    if (
        alerts.length === 0
    ) {

        list.innerHTML = `

            <div class="no-alerts">

                <i class="
                    fa-solid
                    fa-shield-halved
                "></i>

                <strong>
                    NO ACTIVE INDUSTRIAL FIRE ALERTS
                </strong>

                <span>
                    Alerts appear when an Industrial Fire
                    has an AI confidence score of 60% or higher.
                </span>

            </div>

        `;

        return;

    }


    list.innerHTML = "";


    alerts.forEach(
        ({
            event,
            level
        }) => {


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                `alert-item ${level.toLowerCase()}`;


            const icon =
                level === "HIGH"
                    ?
                    "fa-triangle-exclamation"
                    :
                    "fa-bell";


            item.innerHTML = `

                <div class="alert-item-icon">

                    <i class="
                        fa-solid
                        ${icon}
                    "></i>

                </div>


                <div class="alert-item-main">

                    <div class="alert-item-top">

                        <span class="alert-level">

                            ${level} ALERT

                        </span>


                        <span class="alert-confidence">

                            ${formatConfidence(
                                event.confidence
                            )}

                        </span>

                    </div>


                    <strong>

                        ${escapeHTML(
                            event.source_id
                        )}

                    </strong>


                    <span>

                        Industrial Fire •
                        ${escapeHTML(
                            event.landcover
                        )}

                    </span>


                    <small>

                        ${formatCoordinate(
                            event.latitude
                        )}
                        ,
                        ${formatCoordinate(
                            event.longitude
                        )}

                    </small>

                </div>


                <button
                    class="alert-view-button"
                    type="button"
                >

                    VIEW

                </button>

            `;


            const viewButton =
                item.querySelector(
                    ".alert-view-button"
                );


            viewButton.addEventListener(
                "click",
                () => {

                    showEventDetails(
                        event
                    );

                    closeAlertCenter();

                }
            );


            list.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   ALERT CENTER
========================================================= */

function toggleAlertCenter() {

    const center =
        document.getElementById(
            "alert-center"
        );


    if (!center) return;


    center.classList.toggle(
        "hidden"
    );


    if (
        !center.classList.contains(
            "hidden"
        )
    ) {

        renderAlertList();


        center.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* =========================================================
   CLOSE ALERT CENTER
========================================================= */

function closeAlertCenter() {

    const center =
        document.getElementById(
            "alert-center"
        );


    if (center) {

        center.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   POPUP
========================================================= */

function createPopup(event) {

    const type =
        normalizeType(
            event.predicted_event_type
        );


    return `

        <div class="map-popup">

            <div class="popup-kicker">
                THERMAL SOURCE
            </div>


            <strong>
                ${escapeHTML(
                    event.source_id
                )}
            </strong>


            <hr>


            <div>

                <b>AI Classification:</b>

                ${escapeHTML(type)}

            </div>


            <div>

                <b>Confidence:</b>

                ${formatConfidence(
                    event.confidence
                )}

            </div>


            <div>

                <b>Land Cover:</b>

                ${escapeHTML(
                    event.landcover
                )}

            </div>


            <div>

                <b>Mean FRP:</b>

                ${formatNumber(
                    event.mean_frp
                )}

            </div>


            <button
                class="popup-view-button"
                type="button"
                data-source-id="${escapeHTML(
                    event.source_id
                )}"
            >

                VIEW SOURCE DETAILS

            </button>

        </div>

    `;

}


/* =========================================================
   POPUP EVENT DELEGATION
========================================================= */

document.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(
                ".popup-view-button"
            );


        if (!button) return;


        const sourceId =
            button.dataset.sourceId;


        showEventById(
            sourceId
        );

    }
);


/* =========================================================
   PREDICTION FORM
========================================================= */

function setupPredictionForm() {

    const form =
        document.getElementById(
            "prediction-form"
        );


    if (!form) return;


    form.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            await sendPrediction();

        }
    );

}


/* =========================================================
   SEND PREDICTION
========================================================= */

async function sendPrediction() {

    const button =
        document.getElementById(
            "predict-button"
        );


    const originalHTML =
        button.innerHTML;


    button.disabled = true;


    button.innerHTML = `

        <i class="
            fa-solid
            fa-spinner
            fa-spin
        "></i>

        ANALYZING...

    `;


    const inputData = {

        latitude:
            Number(
                document.getElementById(
                    "latitude"
                ).value
            ),

        longitude:
            Number(
                document.getElementById(
                    "longitude"
                ).value
            ),

        mean_frp:
            Number(
                document.getElementById(
                    "mean_frp"
                ).value
            ),

        max_frp:
            Number(
                document.getElementById(
                    "max_frp"
                ).value
            ),

        mean_brightness:
            Number(
                document.getElementById(
                    "mean_brightness"
                ).value
            ),

        max_brightness:
            Number(
                document.getElementById(
                    "max_brightness"
                ).value
            ),

        nearest_facility_type:
            document.getElementById(
                "facility_type"
            ).value,

        distance_to_industry_km:
            Number(
                document.getElementById(
                    "distance_industry"
                ).value
            ),

        industrial_facilities_1km:
            Number(
                document.getElementById(
                    "facilities_1km"
                ).value
            ),

        industrial_facilities_5km:
            Number(
                document.getElementById(
                    "facilities_5km"
                ).value
            ),

        total_detections:
            Number(
                document.getElementById(
                    "total_detections"
                ).value
            ),

        active_days:
            Number(
                document.getElementById(
                    "active_days"
                ).value
            ),

        observation_span_days:
            Number(
                document.getElementById(
                    "observation_span"
                ).value
            )

    };


    try {

        const response =
            await fetch(
                BACKEND_URL,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            inputData
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                `Backend returned ${response.status}`
            );

        }


        const result =
            await response.json();


        console.log(
            "Prediction result:",
            result
        );


        displayPredictionResult(
            result
        );

    }


    catch(error) {

        console.error(
            "Prediction error:",
            error
        );


        showPredictionError(
            "Backend connection failed. Make sure your AI backend is running on http://127.0.0.1:8000"
        );

    }


    finally {

        button.disabled = false;

        button.innerHTML =
            originalHTML;

    }

}


/* =========================================================
   DISPLAY PREDICTION
========================================================= */

function displayPredictionResult(result) {

    const resultBox =
        document.getElementById(
            "prediction-result"
        );


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
            "result-confidence-value"
        );


    const confidenceFill =
        document.getElementById(
            "result-confidence-fill"
        );


    const resultIcon =
        document.getElementById(
            "result-icon"
        );


    const prediction =
        result.predicted_event_type ||
        result.event_type ||
        result.prediction ||
        result.classification ||
        "Other";


    const rawConfidence =
        result.confidence_pct ??
        result.confidence ??
        result.prediction_confidence ??
        result.confidence_score ??
        result.model_confidence ??
        result.probability ??
        result.prediction_probability ??
        null;


    /*
       DO NOT default to zero.
    */

    const confidence =
        parseConfidence(
            rawConfidence
        );


    const normalizedType =
        normalizeType(
            prediction
        );


    const color =
        getEventColor(
            normalizedType
        );


    resultType.textContent =
        normalizedType;


    resultMessage.textContent =
        getPredictionMessage(
            normalizedType
        );


    confidenceValue.textContent =
        formatConfidence(
            confidence
        );


    confidenceFill.style.width =
        `${confidenceWidth(
            confidence
        )}%`;


    confidenceFill.style.background =
        color;


    resultIcon.style.color =
        color;


    resultIcon.style.borderColor =
        color;


    resultIcon.style.background =
        `${color}15`;


    updatePredictionAlert(
        normalizedType,
        confidence
    );


    resultBox.classList.remove(
        "hidden"
    );


    resultBox.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


/* =========================================================
   PREDICTION ALERT
========================================================= */

function updatePredictionAlert(
    type,
    confidence
) {

    const badge =
        document.getElementById(
            "prediction-alert-badge"
        );


    if (!badge) return;


    const level =
        getAlertLevel(
            type,
            confidence
        );


    if (
        level === "HIGH"
    ) {

        badge.className =
            "prediction-alert-badge high";


        badge.innerHTML = `

            <i class="
                fa-solid
                fa-triangle-exclamation
            "></i>

            HIGH ALERT —
            INDUSTRIAL FIRE

        `;

        return;

    }


    if (
        level === "MEDIUM"
    ) {

        badge.className =
            "prediction-alert-badge medium";


        badge.innerHTML = `

            <i class="
                fa-solid
                fa-bell
            "></i>

            MEDIUM ALERT —
            INDUSTRIAL FIRE

        `;

        return;

    }


    if (
        level === "UNKNOWN"
    ) {

        badge.className =
            "prediction-alert-badge unknown";


        badge.innerHTML = `

            <i class="
                fa-solid
                fa-circle-question
            "></i>

            CONFIDENCE NOT AVAILABLE

        `;

        return;

    }


    badge.className =
        "prediction-alert-badge low";


    badge.innerHTML = `

        <i class="
            fa-solid
            fa-circle-check
        "></i>

        NO INDUSTRIAL FIRE ALERT

    `;

}


/* =========================================================
   PREDICTION MESSAGE
========================================================= */

function getPredictionMessage(type) {

    switch(type) {

        case "Industrial":

            return "The detected thermal source shows characteristics associated with industrial activity.";

        case "Forest/Natural":

            return "The thermal source is more consistent with forest or other natural fire activity.";

        case "Agricultural":

            return "The thermal source shows characteristics associated with agricultural burning.";

        default:

            return "The thermal source does not strongly match the other event categories.";

    }

}


/* =========================================================
   PREDICTION ERROR
========================================================= */

function showPredictionError(message) {

    const resultBox =
        document.getElementById(
            "prediction-result"
        );


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
            "result-confidence-value"
        );


    const confidenceFill =
        document.getElementById(
            "result-confidence-fill"
        );


    resultType.textContent =
        "BACKEND OFFLINE";


    resultMessage.textContent =
        message;


    confidenceValue.textContent =
        "—";


    confidenceFill.style.width =
        "0%";


    resultBox.classList.remove(
        "hidden"
    );

}


/* =========================================================
   RESET
========================================================= */

function resetFilters() {

    document.getElementById(
        "type-filter"
    ).value = "ALL";


    document.getElementById(
        "search-input"
    ).value = "";


    document.getElementById(
        "landcover-filter"
    ).value = "ALL";


    document.getElementById(
        "confidence-filter"
    ).value = "0";


    filteredEvents =
        [...allEvents];


    updateDashboard();

    renderMarkers();

    renderTable();


    document.getElementById(
        "selected-source-label"
    ).textContent =
        "NO SOURCE SELECTED";


    document.getElementById(
        "details-content"
    ).className =
        "details-empty";


    document.getElementById(
        "details-content"
    ).innerHTML = `

        <i class="
            fa-solid
            fa-crosshairs
        "></i>

        <h3>
            Select a thermal source
        </h3>

        <p>
            Click a marker on the map or select
            an event from the table to view AI
            classification and source-level
            information.
        </p>

    `;


    updateAlerts();


    if (
        allEvents.length > 0
    ) {

        map.fitBounds(
            allEvents.map(
                event => [
                    event.latitude,
                    event.longitude
                ]
            ),
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
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    document
        .getElementById(
            "type-filter"
        )
        .addEventListener(
            "change",
            applyFilters
        );


    document
        .getElementById(
            "landcover-filter"
        )
        .addEventListener(
            "change",
            applyFilters
        );


    document
        .getElementById(
            "confidence-filter"
        )
        .addEventListener(
            "change",
            applyFilters
        );


    document
        .getElementById(
            "search-input"
        )
        .addEventListener(
            "input",
            applyFilters
        );


    document
        .getElementById(
            "reset-btn"
        )
        .addEventListener(
            "click",
            resetFilters
        );


    document
        .getElementById(
            "alert-button"
        )
        .addEventListener(
            "click",
            toggleAlertCenter
        );


    document
        .getElementById(
            "close-alerts"
        )
        .addEventListener(
            "click",
            closeAlertCenter
        );

}


/* =========================================================
   FORMATTING
========================================================= */

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {

        return "—";

    }


    return value.toLocaleString(
        undefined,
        {
            maximumFractionDigits: 2
        }
    );

}


/* =========================================================
   DISTANCE
========================================================= */

function formatDistance(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {

        return "—";

    }


    return `${value.toFixed(2)} km`;

}


/* =========================================================
   DAYS
========================================================= */

function formatDays(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {

        return "—";

    }


    return `${value.toFixed(2)} days`;

}


/* =========================================================
   COORDINATE
========================================================= */

function formatCoordinate(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {

        return "—";

    }


    return value.toFixed(5);

}


/* =========================================================
   CONFIDENCE DISPLAY
========================================================= */

function formatConfidence(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {

        return "N/A";

    }


    return `${value.toFixed(1)}%`;

}


/* =========================================================
   CONFIDENCE WIDTH
========================================================= */

function confidenceWidth(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {

        return 0;

    }


    return Math.max(
        0,
        Math.min(
            100,
            value
        )
    );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   SECURITY
========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   DATA ERROR
========================================================= */

function showDataError() {

    const tbody =
        document.getElementById(
            "table-body"
        );


    if (!tbody) return;


    tbody.innerHTML = `

        <tr>

            <td
                colspan="9"
                class="data-error"
            >

                <i class="
                    fa-solid
                    fa-triangle-exclamation
                "></i>

                <strong>
                    Could not load predictions.csv
                </strong>

                <small>
                    Make sure predictions.csv is inside
                    the frontend folder.
                </small>

            </td>

        </tr>

    `;


    console.error(
        "Prediction CSV could not be loaded."
    );

}
