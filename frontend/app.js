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


/*
   Backend API

   Change this if your FastAPI/Flask backend
   runs on another address or port.
*/

const BACKEND_URL = "http://127.0.0.1:8000/predict";


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    initializeMap();

    loadPredictionData();

    setupEventListeners();

    setupPredictionForm();

});


/* =========================================================
   MAP
========================================================= */

function initializeMap() {

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


    markersLayer =
        L.layerGroup().addTo(map);

}


/* =========================================================
   LOAD CSV
========================================================= */

function loadPredictionData() {

    const possiblePaths = [

        "static/predictions.csv",

        "./static/predictions.csv",

        "data/predictions.csv",

        "./predictions.csv"

    ];


    tryNextPath(
        possiblePaths,
        0
    );

}


/* =========================================================
   TRY CSV PATH
========================================================= */

function tryNextPath(
    paths,
    index
) {

    if (index >= paths.length) {

        showDataError();

        return;

    }


    Papa.parse(
        paths[index],
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

                    tryNextPath(
                        paths,
                        index + 1
                    );

                    return;

                }


                if (
                    !results.data ||
                    results.data.length === 0
                ) {

                    tryNextPath(
                        paths,
                        index + 1
                    );

                    return;

                }


                console.log(
                    "Loaded:",
                    paths[index]
                );


                processData(
                    results.data
                );

            },


            error: function () {

                tryNextPath(
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


    filteredEvents =
        [...allEvents];


    populateLandCoverFilter();

    updateDashboard();

    renderMarkers();

    renderTable();


    console.log(
        `Loaded ${allEvents.length} thermal sources`
    );

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


    event.source_id =
        getValue(
            row,
            [
                "source_id",
                "SOURCE_ID",
                "Source_ID"
            ]
        );


    event.predicted_event_type =
        getValue(
            row,
            [
                "predicted_event_type",
                "event_type",
                "classification"
            ]
        ) || "Other";


    event.confidence =
        parseNumber(
            getValue(
                row,
                [
                    "confidence_pct",
                    "confidence",
                    "prediction_confidence"
                ]
            )
        );


    event.latitude =
        parseNumber(
            getValue(
                row,
                [
                    "latitude",
                    "lat",
                    "LATITUDE"
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
                    "LONGITUDE"
                ]
            )
        );


    event.landcover =
        getValue(
            row,
            [
                "landcover_class",
                "land_cover",
                "landcover",
                "land_cover_class"
            ]
        ) || "Unknown";


    event.mean_frp =
        parseNumber(
            getValue(
                row,
                [
                    "mean_frp",
                    "mean_frp_mw"
                ]
            )
        );


    event.max_frp =
        parseNumber(
            getValue(
                row,
                [
                    "max_frp",
                    "max_frp_mw"
                ]
            )
        );


    event.mean_brightness =
        parseNumber(
            getValue(
                row,
                [
                    "mean_brightness"
                ]
            )
        );


    event.max_brightness =
        parseNumber(
            getValue(
                row,
                [
                    "max_brightness"
                ]
            )
        );


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
   HELPERS
========================================================= */

function getValue(
    row,
    possibleNames
) {

    for (
        const name of possibleNames
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


function parseNumber(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }


    const number =
        Number(
            String(value)
                .replace("%", "")
                .trim()
        );


    return Number.isFinite(number)
        ? number
        : null;

}


function isValidEvent(event) {

    return (
        event.source_id &&
        Number.isFinite(event.latitude) &&
        Number.isFinite(event.longitude)
    );

}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   DASHBOARD COUNTERS
========================================================= */

function updateDashboard() {

    const total =
        filteredEvents.length;


    const industrial =
        filteredEvents.filter(
            e =>
                normalizeType(
                    e.predicted_event_type
                ) === "Industrial"
        ).length;


    const forest =
        filteredEvents.filter(
            e =>
                normalizeType(
                    e.predicted_event_type
                ) === "Forest/Natural"
        ).length;


    const agricultural =
        filteredEvents.filter(
            e =>
                normalizeType(
                    e.predicted_event_type
                ) === "Agricultural"
        ).length;


    const other =
        filteredEvents.filter(
            e =>
                normalizeType(
                    e.predicted_event_type
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


    const values =
        [
            ...new Set(
                allEvents
                    .map(
                        e =>
                            e.landcover
                    )
                    .filter(
                        value =>
                            value &&
                            value !== "Unknown"
                    )
            )
        ]
        .sort();


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
   FILTERING
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
                    event.source_id
                        .toLowerCase()
                        .includes(search);


                const matchesLandcover =
                    landcover === "ALL" ||
                    event.landcover === landcover;


                const matchesConfidence =
                    !Number.isFinite(
                        event.confidence
                    ) ||
                    safeConfidence(
                        event.confidence
                    ) >= minimumConfidence;


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

}


/* =========================================================
   MAP MARKERS
========================================================= */

function renderMarkers() {

    markersLayer.clearLayers();


    const bounds = [];


    filteredEvents.forEach(
        event => {

            const type =
                normalizeType(
                    event.predicted_event_type
                );


            const color =
                getEventColor(type);


            const marker =
                L.circleMarker(
                    [
                        event.latitude,
                        event.longitude
                    ],
                    {

                        radius: 7,

                        fillColor: color,

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


    if (bounds.length > 0) {

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


    return `

        <div style="min-width:190px">

            <div
                style="
                    font-size:10px;
                    color:#94a3b8;
                    letter-spacing:1px;
                    margin-bottom:5px;
                "
            >
                THERMAL SOURCE
            </div>

            <strong style="font-size:14px">
                ${escapeHTML(
                    event.source_id
                )}
            </strong>

            <hr
                style="
                    border-color:#334155;
                    margin:9px 0;
                "
            >

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
                onclick="showEventById('${escapeAttribute(
                    event.source_id
                )}')"
                style="
                    margin-top:10px;
                    width:100%;
                    background:#18222d;
                    color:#e2e8f0;
                    border:1px solid #334155;
                    padding:5px;
                    border-radius:5px;
                    cursor:pointer;
                "
            >
                VIEW SOURCE DETAILS
            </button>

        </div>

    `;

}


/* =========================================================
   COLORS
========================================================= */

function getEventColor(type) {

    switch (type) {

        case "Industrial":
            return "#ff4d5a";

        case "Forest/Natural":
            return "#22c55e";

        case "Agricultural":
            return "#f59e0b";

        case "Other":
            return "#94a3b8";

        default:
            return "#94a3b8";

    }

}


/* =========================================================
   BADGE CLASS
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


    tbody.innerHTML = "";


    if (
        filteredEvents.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#64748b;
                    "
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

                    <span
                        class="
                            event-badge
                            ${getBadgeClass(type)}
                        "
                    >

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
                        event.active_days !== null
                            ? `${formatNumber(
                                event.active_days
                            )} days`
                            : "—"
                    }

                </td>


                <td>

                    <button
                        class="view-button"
                        onclick="
                            showEventById(
                                '${escapeAttribute(
                                    event.source_id
                                )}'
                            )
                        "
                    >
                        VIEW
                    </button>

                </td>

            `;


            row.addEventListener(
                "click",
                function (e) {

                    if (
                        e.target.tagName !==
                        "BUTTON"
                    ) {

                        showEventDetails(
                            event
                        );

                    }

                }
            );


            tbody.appendChild(row);

        }
    );

}


/* =========================================================
   EVENT DETAILS
========================================================= */

function showEventById(
    sourceId
) {

    const event =
        allEvents.find(
            e =>
                e.source_id ===
                sourceId
        );


    if (event) {

        showEventDetails(
            event
        );

    }

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


    sourceLabel.textContent =
        event.source_id;


    const type =
        normalizeType(
            event.predicted_event_type
        );


    const color =
        getEventColor(type);


    container.className =
        "details-content";


    container.innerHTML = `

        <div class="detail-layout">


            <div class="classification-box">

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
                            width:${safeConfidence(
                                event.confidence
                            )}%;
                            background:${color};
                            box-shadow:
                                0 0 12px ${color};
                        "
                    ></div>

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


    document
        .querySelector(
            ".details-panel"
        )
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

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

            <span>
                ${escapeHTML(label)}
            </span>

            <strong>

                ${escapeHTML(
                    value === null ||
                    value === undefined ||
                    value === ""
                        ? "—"
                        : String(value)
                )}

            </strong>

        </div>

    `;

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


function formatConfidence(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {

        return "—";

    }


    let confidence = value;


    if (
        confidence >= 0 &&
        confidence <= 1
    ) {

        confidence *= 100;

    }


    return `${confidence.toFixed(1)}%`;

}


function safeConfidence(value) {

    if (
        value === null ||
        !Number.isFinite(value)
    ) {

        return 0;

    }


    let confidence =
        Number(value);


    if (
        confidence >= 0 &&
        confidence <= 1
    ) {

        confidence *= 100;

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


function escapeAttribute(value) {

    return String(value)
        .replaceAll(
            "\\",
            "\\\\"
        )
        .replaceAll(
            "'",
            "\\'"
        );

}


/* =========================================================
   RESET FILTERS
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
    ).innerHTML = `

        <div class="details-empty">

            <i class="fa-solid fa-crosshairs"></i>

            <h3>
                Select a thermal source
            </h3>

            <p>
                Click a marker on the map or select
                an event from the table to view
                AI classification and source-level
                information.
            </p>

        </div>

    `;


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
   DATA ERROR
========================================================= */

function showDataError() {

    const tbody =
        document.getElementById(
            "table-body"
        );


    tbody.innerHTML = `

        <tr>

            <td
                colspan="9"
                style="
                    text-align:center;
                    padding:45px;
                    color:#ff7b83;
                "
            >

                <i
                    class="fa-solid
                    fa-triangle-exclamation"
                    style="
                        font-size:22px;
                        display:block;
                        margin-bottom:10px;
                    "
                ></i>

                Could not load
                <strong>
                    static/predictions.csv
                </strong>

                <br>

                <small style="color:#64748b">

                    Make sure the CSV exists inside
                    the static folder.

                </small>

            </td>

        </tr>

    `;


    console.error(
        "Prediction CSV could not be loaded."
    );

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

}


/* =========================================================
   AI PREDICTION FORM
========================================================= */

function setupPredictionForm() {

    const form =
        document.getElementById(
            "prediction-form"
        );


    if (!form) return;


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            await sendPrediction();

        }
    );

}


/* =========================================================
   SEND PREDICTION TO BACKEND
========================================================= */

async function sendPrediction() {

    const button =
        document.getElementById(
            "predict-button"
        );


    const originalText =
        button.innerHTML;


    button.disabled = true;


    button.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

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


    console.log(
        "Sending prediction:",
        inputData
    );


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

    catch (error) {

        console.error(
            "Prediction error:",
            error
        );


        /*
           For now this shows a backend connection
           message instead of pretending that a prediction
           was made.
        */

        showPredictionError(
            "Backend connection failed. Make sure your AI backend is running on http://127.0.0.1:8000"
        );

    }

    finally {

        button.disabled = false;

        button.innerHTML =
            originalText;

    }

}


/* =========================================================
   DISPLAY PREDICTION
========================================================= */

function displayPredictionResult(
    result
) {

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


    /*
       Supports common backend field names.
    */

    const prediction =
        result.predicted_event_type ||
        result.event_type ||
        result.prediction ||
        result.classification ||
        "Other";


    let confidence =
        result.confidence_pct ??
        result.confidence ??
        result.prediction_confidence ??
        0;


    confidence =
        Number(confidence);


    if (
        confidence >= 0 &&
        confidence <= 1
    ) {

        confidence *= 100;

    }


    confidence =
        Math.max(
            0,
            Math.min(
                100,
                confidence
            )
        );


    const normalizedPrediction =
        normalizeType(
            prediction
        );


    const color =
        getEventColor(
            normalizedPrediction
        );


    resultType.textContent =
        normalizedPrediction;


    confidenceValue.textContent =
        `${confidence.toFixed(1)}%`;


    confidenceFill.style.width =
        `${confidence}%`;


    confidenceFill.style.background =
        color;


    confidenceFill.style.boxShadow =
        `0 0 15px ${color}`;


    resultIcon.style.color =
        color;


    resultIcon.style.borderColor =
        color;


    resultIcon.style.background =
        `${color}15`;


    resultMessage.textContent =
        getPredictionMessage(
            normalizedPrediction
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
   PREDICTION MESSAGE
========================================================= */

function getPredictionMessage(
    type
) {

    switch (type) {

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

function showPredictionError(
    message
) {

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


    resultType.textContent =
        "BACKEND OFFLINE";


    resultMessage.textContent =
        message;


    confidenceValue.textContent =
        "—";


    confidenceFill.style.width =
        "0%";


    resultIcon.style.color =
        "#f59e0b";


    resultIcon.style.borderColor =
        "#f59e0b";


    resultBox.classList.remove(
        "hidden"
    );

}
