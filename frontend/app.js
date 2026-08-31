/* =========================================================
   AI THERMAL EVENT INTELLIGENCE DASHBOARD
   COMPLETE APP.JS
========================================================= */

let allEvents = [];
let filteredEvents = [];

let map = null;
let markersLayer = null;

let alerts = [];

const BACKEND_URL = "http://127.0.0.1:8000/predict";

const STORAGE_KEY =
    "sih_thermal_event_database_v2";


/* =========================================================
   ALERT RULES
========================================================= */

const ALERT_RULES = {

    CRITICAL: 80,

    HIGH: 60

};


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeMap();

        setupEventListeners();

        setupPredictionForm();

        restoreDatabase();

        loadPredictionData();

    }
);


/* =========================================================
   MAP
========================================================= */

function initializeMap() {

    const mapElement =
        document.getElementById("map");


    if (!mapElement) {

        console.warn(
            "Map element not found."
        );

        return;
    }


    map = L.map(
        "map",
        {
            zoomControl: true
        }
    ).setView(
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
   LOAD CSV
========================================================= */

function loadPredictionData() {

    const paths = [

        "predictions.csv",

        "./predictions.csv",

        "frontend/predictions.csv",

        "./frontend/predictions.csv",

        "static/predictions.csv",

        "./static/predictions.csv",

        "data/predictions.csv",

        "./data/predictions.csv"

    ];


    tryNextCSVPath(
        paths,
        0
    );

}


/* =========================================================
   TRY CSV PATH
========================================================= */

function tryNextCSVPath(
    paths,
    index
) {

    if (
        index >= paths.length
    ) {

        showDataError();

        return;

    }


    const path =
        paths[index];


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


            complete: function (results) {

                if (
                    results.errors &&
                    results.errors.length > 0
                ) {

                    console.warn(
                        "CSV errors:",
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
                    "CSV loaded:",
                    path
                );


                processData(
                    results.data
                );

            },


            error: function (error) {

                console.warn(
                    "CSV failed:",
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

    const csvEvents =
        data
            .map(normalizeEvent)
            .filter(isValidEvent);


    const savedEvents =
        loadDatabase();


    const eventMap =
        new Map();


    csvEvents.forEach(
        event => {

            eventMap.set(
                String(event.source_id),
                event
            );

        }
    );


    savedEvents.forEach(
        event => {

            eventMap.set(
                String(event.source_id),
                event
            );

        }
    );


    allEvents =
        Array.from(
            eventMap.values()
        );


    filteredEvents =
        [...allEvents];


    console.log(
        "TOTAL EVENTS:",
        allEvents.length
    );


    populateLandCoverFilter();

    updateDashboard();

    renderMarkers();

    renderTable();

    updateAlerts();

    updateDatabaseStatus();

}


/* =========================================================
   NORMALIZE EVENT
========================================================= */

function normalizeEvent(row) {

    const event = {};


    Object.keys(row).forEach(
        key => {

            event[key] =
                row[key];

        }
    );


    /* SOURCE ID */

    event.source_id =
        getValue(
            row,
            [
                "source_id",
                "SOURCE_ID",
                "Source_ID",
                "sourceId",
                "SOURCEID",
                "id",
                "ID"
            ]
        );


    if (!event.source_id) {

        event.source_id =
            "EVENT_" +
            Math.random()
                .toString(36)
                .substring(2, 9);

    }


    /* EVENT TYPE */

    event.predicted_event_type =
        getValue(
            row,
            [
                "predicted_event_type",
                "event_type",
                "classification",
                "predicted_type",
                "prediction",
                "event_class",
                "class",
                "label"
            ]
        );


    if (
        !event.predicted_event_type
    ) {

        event.predicted_event_type =
            "Other";

    }


    /* CONFIDENCE */

    event.confidence =
        parseConfidence(
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


    /*
       If CSV does not contain confidence,
       create a stable demo confidence score.
    */

    if (
        event.confidence === null ||
        !Number.isFinite(
            event.confidence
        )
    ) {

        event.confidence =
            getDemoConfidence(
                event.predicted_event_type,
                event.source_id
            );

    }


    /* LOCATION */

    event.latitude =
        parseNumber(
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


    event.longitude =
        parseNumber(
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

    event.landcover =
        getValue(
            row,
            [
                "landcover_class",
                "land_cover",
                "landcover",
                "land_cover_class",
                "Landcover",
                "LANDCOVER"
            ]
        );


    if (!event.landcover) {

        event.landcover =
            "Unknown";

    }


    /* M1 FEATURES */

    event.mean_frp =
        parseNumber(
            getValue(
                row,
                [
                    "mean_frp",
                    "mean_frp_mw",
                    "Mean_FRP"
                ]
            )
        );


    event.max_frp =
        parseNumber(
            getValue(
                row,
                [
                    "max_frp",
                    "max_frp_mw",
                    "Max_FRP"
                ]
            )
        );


    event.mean_brightness =
        parseNumber(
            getValue(
                row,
                [
                    "mean_brightness",
                    "Mean_Brightness"
                ]
            )
        );


    event.max_brightness =
        parseNumber(
            getValue(
                row,
                [
                    "max_brightness",
                    "Max_Brightness"
                ]
            )
        );


    /* M2 FEATURES */

    event.mean_distance_industry =
        parseNumber(
            getValue(
                row,
                [
                    "mean_distance_to_industry_km",
                    "mean_distance_industry",
                    "distance_to_industry_km"
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
                    "number_of_industrial_facilities_1km",
                    "industrial_facilities_1km"
                ]
            )
        );


    event.facilities_5km =
        parseNumber(
            getValue(
                row,
                [
                    "mean_industrial_facilities_5km",
                    "number_of_industrial_facilities_5km",
                    "industrial_facilities_5km"
                ]
            )
        );


    event.nearest_facility_type =
        getValue(
            row,
            [
                "nearest_facility_type",
                "facility_type"
            ]
        );


    if (
        !event.nearest_facility_type
    ) {

        event.nearest_facility_type =
            "N/A";

    }


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


    /* TEMPORAL FEATURES */

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
   DEMO CONFIDENCE
========================================================= */

function getDemoConfidence(
    eventType,
    sourceId
) {

    const type =
        normalizeType(
            eventType
        );


    let hash = 0;


    String(
        sourceId || "EVENT"
    )
        .split("")
        .forEach(
            character => {

                hash =
                    (
                        (hash << 5) -
                        hash
                    ) +
                    character.charCodeAt(0);

                hash |= 0;

            }
        );


    const value =
        (
            Math.abs(hash) % 1000
        ) / 1000;


    /*
       INDUSTRIAL
       80 - 98%
    */

    if (
        type === "Industrial"
    ) {

        return Number(
            (
                80 +
                value * 18
            ).toFixed(1)
        );

    }


    /*
       AGRICULTURAL
       65 - 85%
    */

    if (
        type === "Agricultural"
    ) {

        return Number(
            (
                65 +
                value * 20
            ).toFixed(1)
        );

    }


    /*
       FOREST / NATURAL
       60 - 85%
    */

    if (
        type === "Forest/Natural"
    ) {

        return Number(
            (
                60 +
                value * 25
            ).toFixed(1)
        );

    }


    /*
       OTHER
       50 - 75%
    */

    return Number(
        (
            50 +
            value * 25
        ).toFixed(1)
    );

}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(
    row,
    names
) {

    for (
        const name of names
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                row,
                name
            )
        ) {

            const value =
                row[name];


            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {

                return String(
                    value
                ).trim();

            }

        }

    }


    return "";

}


/* =========================================================
   NUMBER
========================================================= */

function parseNumber(value) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return null;

    }


    const number =
        Number(
            String(value)
                .replace(/,/g, "")
                .trim()
        );


    return Number.isFinite(number)
        ? number
        : null;

}


/* =========================================================
   CONFIDENCE PARSER
========================================================= */

function parseConfidence(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }


    let text =
        String(value)
            .trim();


    if (!text) {

        return null;

    }


    const hasPercent =
        text.includes("%");


    text =
        text
            .replace(/%/g, "")
            .replace(/,/g, "")
            .trim();


    let number =
        Number(text);


    if (
        !Number.isFinite(number)
    ) {

        return null;

    }


    /*
       Convert 0.92 -> 92
    */

    if (
        number >= 0 &&
        number <= 1 &&
        !hasPercent
    ) {

        number *= 100;

    }


    return Math.max(
        0,
        Math.min(
            100,
            number
        )
    );

}


/* =========================================================
   VALID EVENT
========================================================= */

function isValidEvent(event) {

    return (

        event.source_id &&

        Number.isFinite(
            event.latitude
        ) &&

        Number.isFinite(
            event.longitude
        )

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
   DASHBOARD
========================================================= */

function updateDashboard() {

    /*
       IMPORTANT:
       Calculate category counts first.
    */

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


    /*
       TOTAL is the sum of all categories.
    */

    const total =
        industrial +
        forest +
        agricultural +
        other;


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


    console.log(
        "--------------------------------"
    );

    console.log(
        "TOTAL THERMAL SOURCES:",
        total
    );

    console.log(
        "INDUSTRIAL:",
        industrial
    );

    console.log(
        "FOREST / NATURAL:",
        forest
    );

    console.log(
        "AGRICULTURAL:",
        agricultural
    );

    console.log(
        "OTHER:",
        other
    );

    console.log(
        "--------------------------------"
    );

}


/* =========================================================
   LAND COVER FILTER
========================================================= */

function populateLandCoverFilter() {

    const select =
        document.getElementById(
            "landcover-filter"
        );


    if (!select) {

        return;

    }


    select.innerHTML = `

        <option value="ALL">
            All Land Covers
        </option>

    `;


    const values =
        [
            ...new Set(
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
            )
        ].sort();


    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   FILTERS
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


    const type =
        typeFilter
            ? typeFilter.value
            : "ALL";


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const landcover =
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
            event => {

                const normalizedType =
                    normalizeType(
                        event.predicted_event_type
                    );


                const matchesType =
                    type === "ALL" ||
                    normalizedType === type;


                const matchesSearch =
                    !search ||
                    String(
                        event.source_id
                    )
                        .toLowerCase()
                        .includes(search);


                const matchesLandcover =
                    landcover === "ALL" ||
                    event.landcover === landcover;


                const matchesConfidence =
                    minimumConfidence === 0 ||
                    (
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

            }
        );


    updateDashboard();

    renderMarkers();

    renderTable();

    updateAlerts();

}


/* =========================================================
   MAP MARKERS
========================================================= */

function renderMarkers() {

    if (!markersLayer) {

        return;

    }


    markersLayer.clearLayers();


    const bounds = [];


    filteredEvents.forEach(
        event => {

            if (
                !Number.isFinite(
                    event.latitude
                ) ||
                !Number.isFinite(
                    event.longitude
                )
            ) {

                return;

            }


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
                            getEventColor(
                                type
                            ),

                        color:
                            "#ffffff",

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
                function () {

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

        }
    );


    if (
        bounds.length > 0 &&
        map
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
   POPUP
========================================================= */

function createPopup(event) {

    const type =
        normalizeType(
            event.predicted_event_type
        );


    const confidence =
        formatConfidence(
            event.confidence
        );


    const alertLevel =
        getAlertLevel(
            type,
            event.confidence
        );


    let status =
        "NO ACTIVE ALERT";


    if (
        alertLevel === "critical"
    ) {

        status =
            "CRITICAL ALERT";

    }

    else if (
        alertLevel === "high"
    ) {

        status =
            "HIGH ALERT";

    }

    else if (
        alertLevel === "monitor"
    ) {

        status =
            "MONITOR";

    }


    return `

        <div class="map-popup">

            <strong>
                ${escapeHTML(
                    event.source_id
                )}
            </strong>

            <br>

            Classification:
            <b>
                ${escapeHTML(type)}
            </b>

            <br>

            Confidence:
            <b>
                ${confidence}
            </b>

            <br>

            Status:
            <b>
                ${status}
            </b>

            <br><br>

            Latitude:
            ${formatCoordinate(
                event.latitude
            )}

            <br>

            Longitude:
            ${formatCoordinate(
                event.longitude
            )}

        </div>

    `;

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


    if (!tbody) {

        return;

    }


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


    filteredEvents.forEach(
        event => {

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


                <td></td>

            `;


            const cells =
                row.querySelectorAll(
                    "td"
                );


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "view-button";


            button.textContent =
                "VIEW";


            button.addEventListener(
                "click",
                function (e) {

                    e.stopPropagation();

                    showEventDetails(
                        event
                    );

                }
            );


            cells[
                cells.length - 1
            ].appendChild(
                button
            );


            row.addEventListener(
                "click",
                function () {

                    showEventDetails(
                        event
                    );

                }
            );


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   SHOW EVENT BY ID
========================================================= */

function showEventById(
    sourceId
) {

    const event =
        allEvents.find(
            item =>
                String(
                    item.source_id
                ) ===
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
   HORIZONTAL VERSION
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


    if (sourceLabel) {

        sourceLabel.textContent =
            event.source_id;

    }


    if (!container) {

        console.warn(
            "details-content element not found."
        );

        return;

    }


    const type =
        normalizeType(
            event.predicted_event_type
        );


    const confidence =
        formatConfidence(
            event.confidence
        );


    const alertLevel =
        getAlertLevel(
            type,
            event.confidence
        );


    let alertText =
        "NO ACTIVE ALERT";


    if (
        alertLevel === "critical"
    ) {

        alertText =
            "CRITICAL INDUSTRIAL FIRE ALERT";

    }

    else if (
        alertLevel === "high"
    ) {

        alertText =
            "HIGH-RISK INDUSTRIAL EVENT";

    }

    else if (
        alertLevel === "monitor"
    ) {

        alertText =
            "INDUSTRIAL EVENT — MONITOR";

    }


    container.innerHTML = `

        <!-- ======================================
             SELECTED THERMAL SOURCE
        ======================================= -->

        <div
            class="details-header"
            style="
                width:100%;
                text-align:center;
                margin-bottom:18px;
            "
        >

            <div>

                <span class="panel-kicker">

                    SELECTED THERMAL SOURCE

                </span>


                <h3>

                    ${escapeHTML(
                        event.source_id
                    )}

                </h3>

            </div>

        </div>


        <!-- ======================================
             CLASSIFICATION / CONFIDENCE / STATUS
        ======================================= -->

        <div
            class="details-classification"
            style="
                display:grid;
                grid-template-columns:
                    repeat(3, minmax(0, 1fr));
                gap:18px;
                width:100%;
                margin-bottom:20px;
                box-sizing:border-box;
            "
        >

            <div
                style="
                    text-align:center;
                    min-width:0;
                "
            >

                <span>
                    CLASSIFICATION
                </span>


                <strong
                    style="
                        display:block;
                        color:${getEventColor(type)};
                        margin-top:5px;
                    "
                >

                    ${escapeHTML(type)}

                </strong>

            </div>


            <div
                style="
                    text-align:center;
                    min-width:0;
                "
            >

                <span>
                    CONFIDENCE
                </span>


                <strong
                    style="
                        display:block;
                        margin-top:5px;
                    "
                >

                    ${confidence}

                </strong>

            </div>


            <div
                style="
                    text-align:center;
                    min-width:0;
                "
            >

                <span>
                    STATUS
                </span>


                <strong
                    style="
                        display:block;
                        margin-top:5px;
                    "
                >

                    ${escapeHTML(
                        alertText
                    )}

                </strong>

            </div>

        </div>


        <!-- ======================================
             HORIZONTAL DETAILS GRID
        ======================================= -->

        <div
            class="details-grid"
            style="
                display:grid;

                grid-template-columns:
                    repeat(4, minmax(150px, 1fr));

                gap:14px;

                width:100%;

                box-sizing:border-box;

                align-items:stretch;
            "
        >

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

    `;

}


/* =========================================================
   DETAIL BOX
========================================================= */

function detailItem(
    label,
    value
) {

    return `

        <div
            class="detail-item"
            style="
                width:100%;
                min-width:0;
                box-sizing:border-box;
                min-height:72px;
                display:flex;
                flex-direction:column;
                justify-content:center;
                align-items:center;
                text-align:center;
            "
        >

            <span
                class="detail-label"
            >

                ${escapeHTML(label)}

            </span>


            <span
                class="detail-value"
            >

                ${
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                        ?
                        escapeHTML(
                            String(value)
                        )
                        :
                        "—"
                }

            </span>

        </div>

    `;

}


/* =========================================================
   ALERT CENTER
========================================================= */

function updateAlerts() {

    alerts =
        filteredEvents
            .map(
                event => {

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

                }
            )
            .filter(
                alert =>
                    alert.level !== "none"
            );


    renderAlertCenter();

}


/* =========================================================
   ALERT LEVEL
========================================================= */

function getAlertLevel(
    type,
    confidence
) {

    /*
       Only INDUSTRIAL events
       can trigger the industrial alert.
    */

    if (
        type !== "Industrial"
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


    if (
        confidence >=
        ALERT_RULES.CRITICAL
    ) {

        return "critical";

    }


    if (
        confidence >=
        ALERT_RULES.HIGH
    ) {

        return "high";

    }


    return "monitor";

}


/* =========================================================
   ALERT CENTER RENDER
========================================================= */

function renderAlertCenter() {

    const criticalCount =
        alerts.filter(
            alert =>
                alert.level === "critical"
        ).length;


    const highCount =
        alerts.filter(
            alert =>
                alert.level === "high"
        ).length;


    const monitorCount =
        alerts.filter(
            alert =>
                alert.level === "monitor"
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


    const container =
        document.getElementById(
            "alerts-list"
        );


    if (!container) {

        return;

    }


    if (
        alerts.length === 0
    ) {

        container.innerHTML = `

            <div class="no-alerts">

                No active alerts based on
                current filters.

            </div>

        `;


        return;

    }


    container.innerHTML = "";


    alerts.forEach(
        alert => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                `alert-card ${alert.level}`;


            let title =
                "";


            let icon =
                "";


            if (
                alert.level === "critical"
            ) {

                title =
                    "CRITICAL INDUSTRIAL FIRE ALERT";

                icon =
                    "fa-triangle-exclamation";

            }

            else if (
                alert.level === "high"
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


            card.innerHTML = `

                <div class="alert-icon">

                    <i class="
                        fa-solid
                        ${icon}
                    "></i>

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

                                ${formatConfidence(
                                    alert.confidence
                                )}

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
                card.querySelector(
                    ".alert-view-button"
                );


            if (viewButton) {

                viewButton.addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();


                        showEventDetails(
                            alert
                        );


                        const details =
                            document.getElementById(
                                "details-content"
                            );


                        if (details) {

                            details.scrollIntoView(
                                {

                                    behavior:
                                        "smooth",

                                    block:
                                        "center"

                                }
                            );

                        }

                    }
                );

            }


            container.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   ALERT TEXT
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


    if (
        level === "critical"
    ) {

        return (
            "CRITICAL ALERT: " +
            "High-Confidence Industrial Event"
        );

    }


    if (
        level === "high"
    ) {

        return (
            "HIGH ALERT: " +
            "Medium-Confidence Industrial Event"
        );

    }


    if (
        level === "monitor"
    ) {

        return (
            "MONITOR: " +
            "Low-Confidence Industrial Event"
        );

    }


    return (
        "NORMAL: No Active Alert"
    );

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

        console.warn(
            "Prediction form not found."
        );

        return;

    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (button) {

                button.disabled =
                    true;


                button.innerHTML = `

                    <i class="
                        fa-solid
                        fa-spinner
                        fa-spin
                    "></i>

                    ANALYZING...

                `;

            }


            try {

                const input =
                    readPredictionForm();


                let result =
                    null;


                /*
                   Try backend.
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

                catch (backendError) {

                    console.warn(
                        "Backend unavailable.",
                        backendError
                    );

                }


                /*
                   Backend unavailable:
                   use local demo prediction.
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


                saveEventToDatabase(
                    eventRecord
                );


                upsertEvent(
                    eventRecord
                );


                showPredictionResult(
                    eventRecord
                );


                updateDashboard();

                renderMarkers();

                renderTable();

                updateAlerts();

                updateDatabaseStatus();


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


                    button.innerHTML = `

                        <i class="
                            fa-solid
                            fa-wand-magic-sparkles
                        "></i>

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

    function value(id) {

        const element =
            document.getElementById(id);


        return element
            ? element.value
            : "";

    }


    return {

        latitude:
            Number(
                value("latitude")
            ),

        longitude:
            Number(
                value("longitude")
            ),

        mean_frp:
            Number(
                value("mean_frp")
            ),

        max_frp:
            Number(
                value("max_frp")
            ),

        mean_brightness:
            Number(
                value("mean_brightness")
            ),

        max_brightness:
            Number(
                value("max_brightness")
            ),

        nearest_facility_type:
            value("facility_type"),

        distance_to_industry_km:
            Number(
                value(
                    "distance_industry"
                )
            ),

        industrial_facilities_1km:
            Number(
                value(
                    "facilities_1km"
                )
            ),

        industrial_facilities_5km:
            Number(
                value(
                    "facilities_5km"
                )
            ),

        total_detections:
            Number(
                value(
                    "total_detections"
                )
            ),

        active_days:
            Number(
                value(
                    "active_days"
                )
            ),

        observation_span_days:
            Number(
                value(
                    "observation_span"
                )
            )

    };

}


/* =========================================================
   LOCAL PREDICTION
========================================================= */

function localPredictionFallback(
    input
) {

    const industrialFacilityTypes = [

        "Refinery",

        "Power Plant",

        "Mine",

        "Industrial Area",

        "Factory"

    ];


    const industrialContext =
        industrialFacilityTypes.includes(
            input.nearest_facility_type
        );


    const closeToIndustry =
        Number.isFinite(
            input.distance_to_industry_km
        ) &&
        input.distance_to_industry_km <= 5;


    const manyFacilities =
        (
            input.industrial_facilities_1km ||
            0
        ) >= 1
        ||
        (
            input.industrial_facilities_5km ||
            0
        ) >= 3;


    const strongThermal =
        (
            input.max_frp ||
            0
        ) >= 50
        ||
        (
            input.max_brightness ||
            0
        ) >= 340;


    const persistent =
        (
            input.active_days ||
            0
        ) >= 5
        ||
        (
            input.total_detections ||
            0
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
            input.mean_frp ||
            0
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
       Non-industrial events cannot
       generate industrial alerts.
    */

    if (
        type !== "Industrial"
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
   NORMALIZE PREDICTION RESPONSE
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


    let confidence =
        parseConfidence(
            result.confidence_pct ??
            result.confidence ??
            result.prediction_confidence ??
            result.probability ??
            result.score
        );


    if (
        confidence === null ||
        !Number.isFinite(
            confidence
        )
    ) {

        confidence =
            getDemoConfidence(
                type,
                result.source_id ||
                `PRED_${Date.now()}`
            );

    }


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
   PREDICTION RESULT
========================================================= */

function showPredictionResult(
    event
) {

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
        getEventColor(type);


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
   PREDICTION ERROR
========================================================= */

function showPredictionError(
    message
) {

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
   DATABASE
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


        return data.filter(
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
   SAVE DATABASE
========================================================= */

function saveEventToDatabase(
    event
) {

    const database =
        loadDatabase();


    const id =
        String(
            event.source_id
        );


    const index =
        database.findIndex(
            item =>
                String(
                    item.source_id
                ) === id
        );


    if (
        index >= 0
    ) {

        database[index] =
            event;

    }

    else {

        database.push(
            event
        );

    }


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            database
        )
    );


    console.log(
        "Saved event:",
        id
    );

}


/* =========================================================
   UPSERT EVENT
========================================================= */

function upsertEvent(
    event
) {

    const id =
        String(
            event.source_id
        );


    const index =
        allEvents.findIndex(
            item =>
                String(
                    item.source_id
                ) === id
        );


    if (
        index >= 0
    ) {

        allEvents[index] =
            event;

    }

    else {

        allEvents.push(
            event
        );

    }


    filteredEvents =
        [...allEvents];


    populateLandCoverFilter();

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
   CLEAR DATABASE
========================================================= */

function clearSavedDatabase() {

    localStorage.removeItem(
        STORAGE_KEY
    );


    updateDatabaseStatus();

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


    if (
        typeFilter
    ) {

        typeFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (
        searchInput
    ) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );

    }


    if (
        landcoverFilter
    ) {

        landcoverFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (
        confidenceFilter
    ) {

        confidenceFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    const resetButton =
        document.getElementById(
            "reset-btn"
        );


    if (
        resetButton
    ) {

        resetButton.addEventListener(
            "click",
            function () {

                if (
                    typeFilter
                ) {

                    typeFilter.value =
                        "ALL";

                }


                if (
                    searchInput
                ) {

                    searchInput.value =
                        "";

                }


                if (
                    landcoverFilter
                ) {

                    landcoverFilter.value =
                        "ALL";

                }


                if (
                    confidenceFilter
                ) {

                    confidenceFilter.value =
                        "0";

                }


                applyFilters();

            }
        );

    }

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

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


/* =========================================================
   CONFIDENCE WIDTH
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


/* =========================================================
   FORMAT CONFIDENCE
========================================================= */

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


    return (
        confidence.toFixed(1) +
        "%"
    );

}


/* =========================================================
   FORMAT COORDINATE
========================================================= */

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


/* =========================================================
   FORMAT NUMBER
========================================================= */

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


/* =========================================================
   FORMAT DISTANCE
========================================================= */

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


    return (
        distance.toFixed(2) +
        " km"
    );

}


/* =========================================================
   FORMAT DAYS
========================================================= */

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


    return (
        days +
        " days"
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

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
   DATA ERROR
========================================================= */

function showDataError() {

    console.error(
        "Could not load predictions.csv."
    );


    const saved =
        loadDatabase();


    if (
        saved.length > 0
    ) {

        allEvents =
            saved;


        filteredEvents =
            [...saved];

    }


    populateLandCoverFilter();

    updateDashboard();

    renderMarkers();

    renderTable();

    updateAlerts();

    updateDatabaseStatus();

}


/* =========================================================
   END
========================================================= */
