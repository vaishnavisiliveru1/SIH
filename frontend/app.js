/* =========================================================
   AI-BASED THERMAL EVENT INTELLIGENCE PLATFORM
   COMPLETE app.js

   FEATURES
   ---------------------------------------------------------
   ✓ Load thermal events from predictions.csv
   ✓ Restore saved events from localStorage
   ✓ Display hotspots on Leaflet map
   ✓ Display event database
   ✓ Confidence-based Industrial alerts

       Industrial + confidence >= 80 → CRITICAL
       Industrial + confidence >= 60 → HIGH
       Industrial + confidence < 60  → MONITOR

   ✓ Prediction form
   ✓ ML backend support
   ✓ Frontend fallback if backend is unavailable
   ✓ Save new predictions to browser database
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const DATA_FILE = "predictions.csv";

const BACKEND_URL = "http://127.0.0.1:8000/predict";

const STORAGE_KEY = "sih_thermal_event_database_v2";


/* =========================================================
   ALERT RULES
========================================================= */

const ALERT_RULES = {
    HIGH: 80,
    MEDIUM: 60
};


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let map = null;

let markersLayer = null;

let allEvents = [];

let filteredEvents = [];


/* =========================================================
   APPLICATION START
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeMap();

    setupEventListeners();

    setupPredictionForm();

    restoreDatabase();

    loadPredictionData();

});


/* =========================================================
   MAP INITIALIZATION
========================================================= */

function initializeMap() {

    const mapElement =
        document.getElementById("map");

    if (!mapElement) {

        console.error(
            "Map element not found."
        );

        return;
    }


    map = L.map("map").setView(
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


    markersLayer =
        L.layerGroup().addTo(map);

}


/* =========================================================
   LOAD CSV DATA
========================================================= */

function loadPredictionData() {

    if (typeof Papa === "undefined") {

        console.error(
            "PapaParse library is not loaded."
        );

        showDataError();

        return;
    }


    Papa.parse(

        DATA_FILE,

        {

            download: true,

            header: true,

            skipEmptyLines: true,

            dynamicTyping: false,


            complete: function(results) {

                if (
                    !results ||
                    !Array.isArray(results.data)
                ) {

                    showDataError();

                    return;
                }


                processData(
                    results.data
                );

            },


            error: function(error) {

                console.error(
                    "CSV loading error:",
                    error
                );

                showDataError();

            }

        }

    );

}


/* =========================================================
   PROCESS CSV + DATABASE EVENTS
========================================================= */

function processData(data) {

    const csvEvents =
        data
            .map(
                normalizeEvent
            )
            .filter(
                isValidEvent
            );


    const savedEvents =
        loadDatabase();


    const eventsById =
        new Map();


    [
        ...csvEvents,
        ...savedEvents
    ]
        .forEach(
            function(event) {

                if (
                    event &&
                    event.source_id
                ) {

                    eventsById.set(

                        String(
                            event.source_id
                        ),

                        event

                    );

                }

            }
        );


    allEvents =
        Array.from(
            eventsById.values()
        );


    filteredEvents =
        [...allEvents];


    populateLandCoverFilter();

    updateDashboard();

    renderMarkers();

    renderTable();

    updateAlerts();

    updateDatabaseStatus();


    console.log(

        "Thermal database loaded:",

        allEvents.length,

        "events"

    );

}


/* =========================================================
   NORMALIZE EVENT
========================================================= */

function normalizeEvent(raw) {

    if (!raw) {

        return null;

    }


    const event = {

        source_id:

            getFirstValue(

                raw,

                [
                    "source_id",
                    "Source ID",
                    "SOURCE_ID",
                    "id",
                    "ID"
                ]

            ),


        predicted_event_type:

            getFirstValue(

                raw,

                [
                    "predicted_event_type",
                    "event_type",
                    "classification",
                    "prediction",
                    "Predicted Event Type",
                    "AI Classification"
                ]

            ) || "Other",


        confidence:

            parseConfidence(

                getFirstValue(

                    raw,

                    [
                        "confidence",
                        "confidence_pct",
                        "prediction_confidence",
                        "probability",
                        "score",
                        "Confidence"
                    ]

                )

            ),


        latitude:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "latitude",
                        "lat",
                        "Latitude"
                    ]

                )

            ),


        longitude:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "longitude",
                        "lon",
                        "lng",
                        "Longitude"
                    ]

                )

            ),


        mean_frp:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "mean_frp",
                        "frp",
                        "Mean FRP"
                    ]

                )

            ),


        max_frp:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "max_frp",
                        "Maximum FRP",
                        "Max FRP"
                    ]

                )

            ),


        mean_brightness:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "mean_brightness",
                        "brightness",
                        "Mean Brightness"
                    ]

                )

            ),


        max_brightness:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "max_brightness",
                        "Maximum Brightness",
                        "Max Brightness"
                    ]

                )

            ),


        landcover:

            getFirstValue(

                raw,

                [
                    "landcover",
                    "landcover_class",
                    "Land Cover",
                    "land_cover"
                ]

            ) || "Unknown",


        nearest_facility_type:

            getFirstValue(

                raw,

                [
                    "nearest_facility_type",
                    "facility_type",
                    "Nearest Facility"
                ]

            ) || "Unknown",


        mean_distance_industry:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "mean_distance_industry",
                        "mean_distance_to_industry_km",
                        "distance_to_industry_km",
                        "Distance to Industry"
                    ]

                )

            ),


        facilities_1km:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "facilities_1km",
                        "mean_industrial_facilities_1km",
                        "industrial_facilities_1km"
                    ]

                )

            ),


        facilities_5km:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "facilities_5km",
                        "mean_industrial_facilities_5km",
                        "industrial_facilities_5km"
                    ]

                )

            ),


        total_detections:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "total_detections",
                        "detections"
                    ]

                )

            ),


        active_days:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "active_days"
                    ]

                )

            ),


        observation_span:

            parseNumber(

                getFirstValue(

                    raw,

                    [
                        "observation_span",
                        "observation_span_days"
                    ]

                )

            )

    };


    if (!event.source_id) {

        event.source_id =
            "SRC_" +
            Date.now() +
            "_" +
            Math.floor(
                Math.random() * 10000
            );

    }


    return event;

}


/* =========================================================
   VALIDATE EVENT
========================================================= */

function isValidEvent(event) {

    if (!event) {

        return false;

    }


    if (
        !Number.isFinite(
            event.latitude
        )
    ) {

        return false;

    }


    if (
        !Number.isFinite(
            event.longitude
        )
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   HELPER: GET FIRST AVAILABLE VALUE
========================================================= */

function getFirstValue(
    object,
    keys
) {

    for (
        const key of keys
    ) {

        if (

            object[key] !== undefined &&

            object[key] !== null &&

            object[key] !== ""

        ) {

            return object[key];

        }

    }


    return null;

}


/* =========================================================
   NUMBER PARSER
========================================================= */

function parseNumber(value) {

    if (

        value === null ||

        value === undefined ||

        value === ""

    ) {

        return NaN;

    }


    const number =
        Number(value);


    return Number.isFinite(number)

        ? number

        : NaN;

}


/* =========================================================
   CONFIDENCE PARSER
========================================================= */

function parseConfidence(value) {

    if (

        value === null ||

        value === undefined ||

        value === ""

    ) {

        return NaN;

    }


    let confidence;


    if (
        typeof value === "string"
    ) {

        confidence =
            Number(
                value.replace(
                    "%",
                    ""
                )
            );

    } else {

        confidence =
            Number(value);

    }


    if (
        !Number.isFinite(
            confidence
        )
    ) {

        return NaN;

    }


    /*
       If backend returns confidence
       between 0 and 1,
       convert it to percentage.
    */

    if (
        confidence >= 0 &&
        confidence <= 1
    ) {

        confidence =
            confidence * 100;

    }


    return Math.max(

        0,

        Math.min(
            100,
            confidence
        )

    );

}


/* =========================================================
   EVENT TYPE NORMALIZATION
========================================================= */

function normalizeType(type) {

    if (
        !type
    ) {

        return "Other";

    }


    const value =
        String(type)
            .trim()
            .toLowerCase();


    if (

        value.includes(
            "industrial"
        )

    ) {

        return "Industrial";

    }


    if (

        value.includes(
            "forest"
        ) ||

        value.includes(
            "natural"
        ) ||

        value.includes(
            "wildfire"
        )

    ) {

        return "Forest/Natural";

    }


    if (

        value.includes(
            "agric"
        )

    ) {

        return "Agricultural";

    }


    return "Other";

}


/* =========================================================
   EVENT COLORS
========================================================= */

function getEventColor(type) {

    const normalized =
        normalizeType(type);


    if (
        normalized === "Industrial"
    ) {

        return "#ef4444";

    }


    if (
        normalized === "Forest/Natural"
    ) {

        return "#22c55e";

    }


    if (
        normalized === "Agricultural"
    ) {

        return "#f59e0b";

    }


    return "#38bdf8";

}


/* =========================================================
   RENDER HOTSPOTS
========================================================= */

function renderMarkers() {

    if (

        !map ||

        !markersLayer

    ) {

        return;

    }


    markersLayer.clearLayers();


    filteredEvents.forEach(

        function(event) {

            if (
                !isValidEvent(event)
            ) {

                return;

            }


            const type =
                normalizeType(
                    event.predicted_event_type
                );


            const color =
                getEventColor(
                    type
                );


            const marker =
                L.circleMarker(

                    [
                        event.latitude,
                        event.longitude
                    ],

                    {

                        radius: 8,

                        color: color,

                        fillColor: color,

                        fillOpacity: 0.8,

                        weight: 2

                    }

                );


            marker.on(

                "click",

                function() {

                    showEventDetails(
                        event
                    );

                }

            );


            marker.bindPopup(

                `
                <div class="map-popup">

                    <strong>
                        ${escapeHTML(
                            event.source_id
                        )}
                    </strong>

                    <br>

                    <span>
                        ${escapeHTML(
                            type
                        )}
                    </span>

                    <br>

                    <strong>
                        ${formatConfidence(
                            event.confidence
                        )}
                    </strong>

                </div>
                `

            );


            marker.addTo(
                markersLayer
            );

        }

    );

}


/* =========================================================
   SHOW EVENT DETAILS
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


    if (!container) {

        return;

    }


    if (sourceLabel) {

        sourceLabel.textContent =
            event.source_id;

    }


    const type =
        normalizeType(
            event.predicted_event_type
        );


    const color =
        getEventColor(
            type
        );


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

                    ${escapeHTML(
                        type
                    )}

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


                <div
                    class="
                        detail-alert-status
                        ${alertLevel}
                    "
                >

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
                        event.observation_span
                    )
                )}

            </div>

        </div>

    `;

}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {

    const total =
        filteredEvents.length;


    const industrial =
        filteredEvents.filter(

            event =>

                normalizeType(
                    event.predicted_event_type
                )

                === "Industrial"

        ).length;


    const natural =
        filteredEvents.filter(

            event =>

                normalizeType(
                    event.predicted_event_type
                )

                === "Forest/Natural"

        ).length;


    const agricultural =
        filteredEvents.filter(

            event =>

                normalizeType(
                    event.predicted_event_type
                )

                === "Agricultural"

        ).length;


    setText(
        "total-events",
        total
    );


    setText(
        "industrial-count",
        industrial
    );


    setText(
        "natural-count",
        natural
    );


    setText(
        "agricultural-count",
        agricultural
    );


    setText(
        "visible-count",

        `${total} EVENTS`

    );

}


/* =========================================================
   RENDER DATABASE TABLE
========================================================= */

function renderTable() {

    const tableBody =
        document.getElementById(
            "table-body"
        );


    if (!tableBody) {

        return;

    }


    tableBody.innerHTML = "";


    if (
        filteredEvents.length === 0
    ) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty-table"
                >

                    No thermal events found.

                </td>

            </tr>

        `;


        return;

    }


    filteredEvents.forEach(

        function(event) {

            const row =
                document.createElement(
                    "tr"
                );


            const type =
                normalizeType(
                    event.predicted_event_type
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        event.source_id
                    )}
                </td>

                <td>

                    <span
                        class="event-type-badge"
                    >

                        ${escapeHTML(
                            type
                        )}

                    </span>

                </td>

                <td>

                    ${formatConfidence(
                        event.confidence
                    )}

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

                    ${formatNumber(
                        event.active_days
                    )}

                </td>

                <td>

                    <button
                        type="button"
                        class="table-view-button"
                    >

                        VIEW

                    </button>

                </td>

            `;


            const button =
                row.querySelector(
                    ".table-view-button"
                );


            if (button) {

                button.addEventListener(

                    "click",

                    function() {

                        showEventDetails(
                            event
                        );


                        if (

                            map &&

                            Number.isFinite(
                                event.latitude
                            ) &&

                            Number.isFinite(
                                event.longitude
                            )

                        ) {

                            map.setView(

                                [
                                    event.latitude,
                                    event.longitude
                                ],

                                12

                            );

                        }

                    }

                );

            }


            tableBody.appendChild(
                row
            );

        }

    );

}


/* =========================================================
   FILTER EVENTS
========================================================= */

function applyFilters() {

    const typeFilter =
        document.getElementById(
            "type-filter"
        );


    const searchInput =
        document.getElementById(
            "search-input"
        );


    const landcoverFilter =
        document.getElementById(
            "landcover-filter"
        );


    const confidenceFilter =
        document.getElementById(
            "confidence-filter"
        );


    const selectedType =
        typeFilter
            ? typeFilter.value
            : "ALL";


    const searchText =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const selectedLandcover =
        landcoverFilter
            ? landcoverFilter.value
            : "ALL";


    const minimumConfidence =
        confidenceFilter
            ? Number(
                confidenceFilter.value
            )
            : 0;


    filteredEvents =
        allEvents.filter(

            function(event) {

                const type =
                    normalizeType(
                        event.predicted_event_type
                    );


                const matchesType =

                    selectedType === "ALL" ||

                    selectedType === "" ||

                    type === selectedType;


                const matchesSearch =

                    !searchText ||

                    String(
                        event.source_id
                    )
                        .toLowerCase()
                        .includes(
                            searchText
                        );


                const matchesLandcover =

                    selectedLandcover === "ALL" ||

                    selectedLandcover === "" ||

                    String(
                        event.landcover
                    )

                    === selectedLandcover;


                const matchesConfidence =

                    !Number.isFinite(
                        event.confidence
                    )

                    ? minimumConfidence === 0

                    : event.confidence >=
                        minimumConfidence;


                return (

                    matchesType &&

                    matchesSearch &&

                    matchesLandcover &&

                    matchesConfidence

                );

            }

        );


    updateDashboard();

    renderMarkers();

    renderTable();

    updateAlerts();

}


/* =========================================================
   LAND COVER FILTER
========================================================= */

function populateLandCoverFilter() {

    const filter =
        document.getElementById(
            "landcover-filter"
        );


    if (!filter) {

        return;

    }


    const currentValue =
        filter.value;


    const landcovers =
        [...new Set(

            allEvents

                .map(
                    event =>
                        event.landcover
                )

                .filter(
                    value =>
                        value &&
                        value !== "Unknown"
                )

        )]
            .sort();


    filter.innerHTML =
        `<option value="ALL">
            ALL LAND COVER
        </option>`;


    landcovers.forEach(

        function(landcover) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                landcover;


            option.textContent =
                landcover;


            filter.appendChild(
                option
            );

        }

    );


    if (

        [...filter.options]

            .some(

                option =>

                    option.value ===
                    currentValue

            )

    ) {

        filter.value =
            currentValue;

    }

}


/* =========================================================
   ALERT CENTER
========================================================= */

function updateAlerts() {

    const container =
        document.getElementById(
            "alerts-list"
        );


    if (!container) {

        return;

    }


    const alerts =
        filteredEvents

            .map(

                function(event) {

                    const level =
                        getAlertLevel(

                            normalizeType(
                                event.predicted_event_type
                            ),

                            event.confidence

                        );


                    return {

                        ...event,

                        level: level

                    };

                }

            )

            .filter(

                alert =>

                    alert.level !== "none"

            );


    const criticalCount =
        alerts.filter(

            alert =>

                alert.level ===
                "critical"

        ).length;


    const highCount =
        alerts.filter(

            alert =>

                alert.level ===
                "high"

        ).length;


    const monitorCount =
        alerts.filter(

            alert =>

                alert.level ===
                "monitor"

        ).length;


    setText(
        "critical-alert-count",
        criticalCount
    );


    setText(
        "high-alert-count",
        highCount
    );


    setText(
        "monitor-alert-count",
        monitorCount
    );


    container.innerHTML = "";


    if (
        alerts.length === 0
    ) {

        container.innerHTML = `

            <div class="no-alerts">

                No active Industrial alerts
                based on current confidence levels.

            </div>

        `;


        return;

    }


    alerts

        .sort(

            function(a, b) {

                return (

                    b.confidence -
                    a.confidence

                );

            }

        )

        .forEach(

            function(alert) {

                createAlertCard(
                    alert,
                    container
                );

            }

        );

}


/* =========================================================
   CREATE ALERT CARD
========================================================= */

function createAlertCard(
    alert,
    container
) {

    const alertCard =
        document.createElement(
            "div"
        );


    alertCard.className =
        `alert-card ${alert.level}`;


    const confidence =
        formatConfidence(
            alert.confidence
        );


    let title = "";

    let icon = "";


    if (
        alert.level ===
        "critical"
    ) {

        title =
            "CRITICAL INDUSTRIAL FIRE ALERT";


        icon =
            "fa-triangle-exclamation";

    }

    else if (
        alert.level ===
        "high"
    ) {

        title =
            "HIGH-RISK INDUSTRIAL EVENT";


        icon =
            "fa-fire";

    }

    else {

        title =
            "INDUSTRIAL EVENT — MONITOR";


        icon =
            "fa-eye";

    }


    alertCard.innerHTML = `

        <div class="alert-icon">

            <i
                class="
                    fa-solid
                    ${icon}
                "
            ></i>

        </div>


        <div class="alert-content">

            <div class="alert-title">

                ${title}

            </div>


            <div class="alert-source">

                Source:

                <strong>

                    ${escapeHTML(
                        alert.source_id
                    )}

                </strong>

            </div>


            <div class="alert-details">

                <span>

                    Classification:

                    ${escapeHTML(

                        normalizeType(
                            alert.predicted_event_type
                        )

                    )}

                </span>


                <span>

                    Confidence:

                    <strong>

                        ${confidence}

                    </strong>

                </span>

            </div>

        </div>


        <button
            type="button"
            class="alert-view-button"
        >

            VIEW

        </button>

    `;


    const viewButton =
        alertCard.querySelector(
            ".alert-view-button"
        );


    if (viewButton) {

        viewButton.addEventListener(

            "click",

            function(event) {

                event.stopPropagation();


                showEventDetails(
                    alert
                );


                if (

                    map &&

                    Number.isFinite(
                        alert.latitude
                    ) &&

                    Number.isFinite(
                        alert.longitude
                    )

                ) {

                    map.setView(

                        [
                            alert.latitude,
                            alert.longitude
                        ],

                        12

                    );

                }


                document

                    .getElementById(
                        "details-content"
                    )

                    ?.scrollIntoView({

                        behavior:
                            "smooth",

                        block:
                            "center"

                    });

            }

        );

    }


    container.appendChild(
        alertCard
    );

}


/* =========================================================
   ALERT LOGIC
========================================================= */

function getAlertLevel(
    type,
    confidence
) {

    /*
        IMPORTANT ALERT CONDITION

        Only Industrial events
        create Industrial alerts.
    */

    if (

        normalizeType(type) !==
        "Industrial"

    ) {

        return "none";

    }


    if (

        !Number.isFinite(
            confidence
        )

    ) {

        return "none";

    }


    /*
        Confidence >= 80
        → CRITICAL
    */

    if (

        confidence >=
        ALERT_RULES.HIGH

    ) {

        return "critical";

    }


    /*
        Confidence >= 60
        → HIGH
    */

    if (

        confidence >=
        ALERT_RULES.MEDIUM

    ) {

        return "high";

    }


    /*
        Industrial confidence < 60
        → MONITOR
    */

    return "monitor";

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


    switch (level) {

        case "critical":

            return

                "CRITICAL ALERT: High-Confidence Industrial Event";


        case "high":

            return

                "HIGH ALERT: Medium-Confidence Industrial Event";


        case "monitor":

            return

                "MONITOR: Low-Confidence Industrial Event";


        default:

            return

                "NORMAL: No Active Alert";

    }

}


/* =========================================================
   PREDICTION FORM
========================================================= */

function setupPredictionForm() {

    const form =
        document.getElementById(
            "prediction-form"
        );


    const button =
        document.getElementById(
            "predict-button"
        );


    if (!form) {

        return;

    }


    form.addEventListener(

        "submit",

        async function(event) {

            event.preventDefault();


            if (button) {

                button.disabled = true;

                button.innerHTML =

                    `
                    <i
                        class="
                            fa-solid
                            fa-spinner
                            fa-spin
                        "
                    ></i>

                    ANALYZING...
                    `;

            }


            try {

                const input =
                    readPredictionForm();


                let result =
                    null;


                /*
                    TRY REAL ML BACKEND
                */

                try {

                    const response =
                        await fetch(

                            BACKEND_URL,

                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:

                                    JSON.stringify(
                                        input
                                    )

                            }

                        );


                    if (
                        response.ok
                    ) {

                        result =
                            await response.json();

                    }

                }

                catch (
                    backendError
                ) {

                    console.warn(

                        "Backend unavailable. Using frontend fallback.",

                        backendError

                    );

                }


                /*
                    FRONTEND FALLBACK
                */

                if (!result) {

                    result =
                        localPredictionFallback(
                            input
                        );

                }


                const eventRecord =
                    normalizePredictionResponse(

                        result,

                        input

                    );


                /*
                    SAVE TO DATABASE
                */

                saveEventToDatabase(
                    eventRecord
                );


                /*
                    ADD TO CURRENT EVENTS
                */

                upsertEvent(
                    eventRecord
                );


                /*
                    UPDATE UI
                */

                showPredictionResult(
                    eventRecord
                );


                updateDashboard();

                renderMarkers();

                renderTable();

                updateAlerts();

                updateDatabaseStatus();


                /*
                    SHOW NEW HOTSPOT
                */

                if (

                    map &&

                    Number.isFinite(
                        eventRecord.latitude
                    ) &&

                    Number.isFinite(
                        eventRecord.longitude
                    )

                ) {

                    map.setView(

                        [
                            eventRecord.latitude,
                            eventRecord.longitude
                        ],

                        12

                    );


                    showEventDetails(
                        eventRecord
                    );

                }

            }

            catch (error) {

                console.error(

                    "Prediction failed:",

                    error

                );


                showPredictionError(

                    error.message ||

                    "Prediction failed."

                );

            }

            finally {

                if (button) {

                    button.disabled =
                        false;


                    button.innerHTML =

                        `
                        <i
                            class="
                                fa-solid
                                fa-wand-magic-sparkles
                            "
                        ></i>

                        PREDICT EVENT
                        `;

                }

            }

        }

    );

}


/* =========================================================
   READ PREDICTION FORM
========================================================= */

function readPredictionForm() {

    const get =
        function(id) {

            const element =
                document.getElementById(
                    id
                );


            return element
                ? element.value
                : "";

        };


    return {

        latitude:
            Number(
                get("latitude")
            ),

        longitude:
            Number(
                get("longitude")
            ),

        mean_frp:
            Number(
                get("mean_frp")
            ),

        max_frp:
            Number(
                get("max_frp")
            ),

        mean_brightness:
            Number(
                get("mean_brightness")
            ),

        max_brightness:
            Number(
                get("max_brightness")
            ),

        nearest_facility_type:
            get("facility_type"),

        distance_to_industry_km:
            Number(
                get("distance_industry")
            ),

        industrial_facilities_1km:
            Number(
                get("facilities_1km")
            ),

        industrial_facilities_5km:
            Number(
                get("facilities_5km")
            ),

        total_detections:
            Number(
                get("total_detections")
            ),

        active_days:
            Number(
                get("active_days")
            ),

        observation_span_days:
            Number(
                get("observation_span")
            )

    };

}


/* =========================================================
   FRONTEND FALLBACK PREDICTION
========================================================= */

function localPredictionFallback(input) {

    const industrialContext =

        [

            "Refinery",

            "Power Plant",

            "Mine",

            "Industrial Area",

            "Factory"

        ]

        .includes(
            input.nearest_facility_type
        );


    const closeToIndustry =

        Number.isFinite(
            input.distance_to_industry_km
        )

        &&

        input.distance_to_industry_km <= 5;


    const manyFacilities =

        (

            input.industrial_facilities_1km || 0

        ) >= 1

        ||

        (

            input.industrial_facilities_5km || 0

        ) >= 3;


    const strongThermal =

        (

            input.max_frp || 0

        ) >= 50

        ||

        (

            input.max_brightness || 0

        ) >= 340;


    const persistent =

        (

            input.active_days || 0

        ) >= 5

        ||

        (

            input.total_detections || 0

        ) >= 10;


    let score = 0;


    if (
        industrialContext
    ) {

        score += 30;

    }


    if (
        closeToIndustry
    ) {

        score += 20;

    }


    if (
        manyFacilities
    ) {

        score += 15;

    }


    if (
        strongThermal
    ) {

        score += 20;

    }


    if (
        persistent
    ) {

        score += 15;

    }


    let type =
        "Other";


    if (

        industrialContext &&

        (

            strongThermal ||

            persistent ||

            closeToIndustry

        )

    ) {

        type =
            "Industrial";

    }

    else if (

        persistent &&

        !industrialContext

    ) {

        type =
            "Forest/Natural";

    }

    else if (

        (

            input.mean_frp || 0

        ) >= 15

    ) {

        type =
            "Agricultural";

    }


    let confidence =

        Math.max(

            45,

            Math.min(

                98,

                45 + score

            )

        );


    /*
        Non-industrial events
        should not trigger Industrial alerts.
    */

    if (

        type !==
        "Industrial"

    ) {

        confidence =
            Math.min(
                confidence,
                59
            );

    }


    return {

        predicted_event_type:
            type,

        confidence_pct:
            confidence

    };

}


/* =========================================================
   NORMALIZE BACKEND RESPONSE
========================================================= */

function normalizePredictionResponse(
    result,
    input
) {

    const type =

        result.predicted_event_type ||

        result.event_type ||

        result.classification ||

        result.predicted_type ||

        result.prediction ||

        "Other";


    const confidence =
        parseConfidence(

            result.confidence_pct ??

            result.confidence ??

            result.prediction_confidence ??

            result.probability ??

            result.score

        );


    return normalizeEvent(

        {

            source_id:

                result.source_id ||

                `PRED_${Date.now()}`,


            predicted_event_type:
                type,


            confidence_pct:
                confidence,


            latitude:
                input.latitude,


            longitude:
                input.longitude,


            mean_frp:
                input.mean_frp,


            max_frp:
                input.max_frp,


            mean_brightness:
                input.mean_brightness,


            max_brightness:
                input.max_brightness,


            nearest_facility_type:
                input.nearest_facility_type,


            mean_distance_to_industry_km:
                input.distance_to_industry_km,


            mean_industrial_facilities_1km:
                input.industrial_facilities_1km,


            mean_industrial_facilities_5km:
                input.industrial_facilities_5km,


            total_detections:
                input.total_detections,


            active_days:
                input.active_days,


            observation_span_days:
                input.observation_span_days,


            landcover_class:

                result.landcover_class ||

                result.landcover ||

                "Unknown"

        }

    );

}


/* =========================================================
   SHOW PREDICTION RESULT
========================================================= */

function showPredictionResult(event) {

    const resultBox =
        document.getElementById(
            "prediction-result"
        );


    if (!resultBox) {

        return;

    }


    const type =
        normalizeType(
            event.predicted_event_type
        );


    const confidence =
        event.confidence;


    const color =
        getEventColor(
            type
        );


    resultBox.classList.remove(
        "hidden"
    );


    const icon =
        document.getElementById(
            "result-icon"
        );


    const typeElement =
        document.getElementById(
            "result-type"
        );


    const messageElement =
        document.getElementById(
            "result-message"
        );


    const confidenceElement =
        document.getElementById(
            "result-confidence-value"
        );


    const fill =
        document.getElementById(
            "result-confidence-fill"
        );


    if (icon) {

        icon.style.color =
            color;

        icon.style.borderColor =
            color;

        icon.style.background =
            `${color}18`;

    }


    if (typeElement) {

        typeElement.textContent =
            type;

        typeElement.style.color =
            color;

    }


    if (messageElement) {

        messageElement.textContent =

            getAlertDisplayText(

                type,

                confidence

            );

    }


    if (confidenceElement) {

        confidenceElement.textContent =

            formatConfidence(
                confidence
            );

    }


    if (fill) {

        fill.style.width =

            `${confidenceWidth(
                confidence
            )}%`;


        fill.style.background =
            color;

    }

}


/* =========================================================
   SHOW PREDICTION ERROR
========================================================= */

function showPredictionError(message) {

    const resultBox =
        document.getElementById(
            "prediction-result"
        );


    if (!resultBox) {

        alert(message);

        return;

    }


    resultBox.classList.remove(
        "hidden"
    );


    setText(
        "result-type",
        "Prediction Error"
    );


    setText(
        "result-message",
        message
    );


    setText(
        "result-confidence-value",
        "N/A"
    );


    const fill =
        document.getElementById(
            "result-confidence-fill"
        );


    if (fill) {

        fill.style.width =
            "0%";

    }

}


/* =========================================================
   ADD / UPDATE EVENT
========================================================= */

function upsertEvent(eventRecord) {

    const id =
        String(
            eventRecord.source_id
        );


    const index =
        allEvents.findIndex(

            event =>

                String(
                    event.source_id
                )

                ===

                id

        );


    if (
        index >= 0
    ) {

        allEvents[index] =
            eventRecord;

    }

    else {

        allEvents.push(
            eventRecord
        );

    }


    filteredEvents =
        [...allEvents];


    populateLandCoverFilter();

}


/* =========================================================
   SAVE TO DATABASE
========================================================= */

function saveEventToDatabase(eventRecord) {

    const database =
        loadDatabase();


    const id =
        String(
            eventRecord.source_id
        );


    const index =
        database.findIndex(

            event =>

                String(
                    event.source_id
                )

                ===

                id

        );


    if (
        index >= 0
    ) {

        database[index] =
            eventRecord;

    }

    else {

        database.push(
            eventRecord
        );

    }


    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(
            database
        )

    );

}


/* =========================================================
   LOAD DATABASE
========================================================= */

function loadDatabase() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!raw) {

            return [];

        }


        const data =
            JSON.parse(
                raw
            );


        if (
            !Array.isArray(data)
        ) {

            return [];

        }


        return data

            .map(
                normalizeEvent
            )

            .filter(
                isValidEvent
            );

    }

    catch (error) {

        console.error(

            "Database read error:",

            error

        );


        return [];

    }

}


/* =========================================================
   RESTORE DATABASE
========================================================= */

function restoreDatabase() {

    const saved =
        loadDatabase();


    if (
        saved.length > 0
    ) {

        allEvents =
            saved;


        filteredEvents =
            [...saved];


        populateLandCoverFilter();

        updateDashboard();

        renderMarkers();

        renderTable();

        updateAlerts();

    }


    updateDatabaseStatus();

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function updateDatabaseStatus() {

    const element =
        document.getElementById(
            "database-status"
        );


    if (!element) {

        return;

    }


    const count =
        loadDatabase().length;


    if (
        count > 0
    ) {

        element.textContent =
            `DATABASE: ${count} SAVED`;

    }

    else {

        element.textContent =
            "DATABASE READY";

    }

}


/* =========================================================
   CLEAR DATABASE
========================================================= */

function clearSavedDatabase() {

    localStorage.removeItem(
        STORAGE_KEY
    );


    updateDatabaseStatus();

}


/* =========================================================
   HELPER UTILITIES
========================================================= */

function confidenceWidth(
    confidence
) {

    if (

        !Number.isFinite(
            confidence
        )

    ) {

        return 0;

    }


    return Math.max(

        0,

        Math.min(
            100,
            confidence
        )

    );

}


function detailItem(
    label,
    value
) {

    const safeValue =

        value !== null &&

        value !== undefined &&

        value !== ""

            ?

            escapeHTML(
                String(value)
            )

            :

            "—";


    return `

        <div class="detail-item">

            <span class="detail-label">

                ${escapeHTML(
                    label
                )}

            </span>


            <span class="detail-value">

                ${safeValue}

            </span>

        </div>

    `;

}


function setText(
    id,
    text
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            text;

    }

}


function formatConfidence(
    confidence
) {

    if (

        !Number.isFinite(
            confidence
        )

    ) {

        return "N/A";

    }


    return `${confidence.toFixed(1)}%`;

}


function formatCoordinate(
    coordinate
) {

    if (

        !Number.isFinite(
            coordinate
        )

    ) {

        return "—";

    }


    return coordinate.toFixed(
        4
    );

}


function formatNumber(
    number
) {

    if (

        !Number.isFinite(
            number
        )

    ) {

        return "—";

    }


    return number.toLocaleString();

}


function formatDistance(
    distance
) {

    if (

        !Number.isFinite(
            distance
        )

    ) {

        return "—";

    }


    return `${distance.toFixed(2)} km`;

}


function formatDays(
    days
) {

    if (

        !Number.isFinite(
            days
        )

    ) {

        return "—";

    }


    return `${days} days`;

}


function escapeHTML(value) {

    if (

        value === null ||

        value === undefined

    ) {

        return "";

    }


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
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    const typeFilter =
        document.getElementById(
            "type-filter"
        );


    const searchInput =
        document.getElementById(
            "search-input"
        );


    const landcoverFilter =
        document.getElementById(
            "landcover-filter"
        );


    const confidenceFilter =
        document.getElementById(
            "confidence-filter"
        );


    if (typeFilter) {

        typeFilter.addEventListener(

            "change",

            applyFilters

        );

    }


    if (searchInput) {

        searchInput.addEventListener(

            "input",

            applyFilters

        );

    }


    if (landcoverFilter) {

        landcoverFilter.addEventListener(

            "change",

            applyFilters

        );

    }


    if (confidenceFilter) {

        confidenceFilter.addEventListener(

            "change",

            applyFilters

        );

    }


    const resetButton =
        document.getElementById(
            "reset-btn"
        );


    if (resetButton) {

        resetButton.addEventListener(

            "click",

            function() {

                if (typeFilter) {

                    typeFilter.value =
                        "ALL";

                }


                if (searchInput) {

                    searchInput.value =
                        "";

                }


                if (landcoverFilter) {

                    landcoverFilter.value =
                        "ALL";

                }


                if (confidenceFilter) {

                    confidenceFilter.value =
                        "0";

                }


                applyFilters();

            }

        );

    }

}


/* =========================================================
   DATA ERROR HANDLER
========================================================= */

function showDataError() {

    console.warn(

        "predictions.csv could not be loaded. " +

        "Saved database records will still be available."

    );


    updateDatabaseStatus();

    updateDashboard();

    renderMarkers();

    renderTable();

    updateAlerts();

}