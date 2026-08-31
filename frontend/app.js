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
const ALERT_THRESHOLDS = { critical: 85, high: 70, monitor: 50 };


/*
   Backend API

   Change this if your FastAPI/Flask backend
   runs on another address or port.
*/

const BACKEND_URL = "https://sailajacode-sih-fire-recognation.hf.space/predict";


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
   MAP INITIALIZATION
========================================================= */

function initializeMap() {

    map = L.map("map", {

        center: [20.5937, 78.9629],

        zoom: 5,

        zoomControl: true

    });


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            attribution:
                '&copy; OpenStreetMap contributors',

            maxZoom: 19

        }

    ).addTo(map);


    markersLayer =
        L.layerGroup().addTo(map);

}


/* =========================================================
   LOAD PREDICTION DATA
========================================================= */

async function loadPredictionData() {

    try {

        const response =
            await fetch(
                "predictions.csv"
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load predictions.csv"
            );

        }


        const csvText =
            await response.text();


        allEvents =
            parseCSV(csvText);


        filteredEvents =
            [...allEvents];


        updateDashboard();

        renderMapMarkers();

    }

    catch (error) {

        console.error(
            "Data loading error:",
            error
        );

    }

}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(
    text
) {

    const lines =
        text
            .trim()
            .split(/\r?\n/);


    if (lines.length < 2) {

        return [];

    }


    const headers =
        parseCSVLine(
            lines[0]
        );


    const rows = [];


    for (
        let i = 1;
        i < lines.length;
        i++
    ) {

        if (!lines[i].trim()) {

            continue;

        }


        const values =
            parseCSVLine(
                lines[i]
            );


        const row = {};


        headers.forEach(
            function (
                header,
                index
            ) {

                row[header] =
                    values[index] ??
                    "";

            }
        );


        rows.push(row);

    }


    return rows;

}


/* =========================================================
   CSV LINE PARSER
========================================================= */

function parseCSVLine(
    line
) {

    const result = [];

    let current = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < line.length;
        i++
    ) {

        const char =
            line[i];


        if (
            char === '"'
        ) {

            if (
                insideQuotes &&
                line[i + 1] === '"'
            ) {

                current += '"';

                i++;

            }

            else {

                insideQuotes =
                    !insideQuotes;

            }

        }

        else if (
            char === "," &&
            !insideQuotes
        ) {

            result.push(
                current.trim()
            );

            current = "";

        }

        else {

            current += char;

        }

    }


    result.push(
        current.trim()
    );


    return result;

}


/* =========================================================
   DASHBOARD UPDATE
========================================================= */

function updateDashboard() {

    updateStatistics();

    updateEventTable();

    updateEventCounts();

}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    const total =
        filteredEvents.length;


    const industrial =
        filteredEvents.filter(
            event =>
                normalizeType(
                    event.event_type
                ) === "Industrial"
        ).length;


    const forest =
        filteredEvents.filter(
            event =>
                normalizeType(
                    event.event_type
                ) === "Forest/Natural"
        ).length;


    const agricultural =
        filteredEvents.filter(
            event =>
                normalizeType(
                    event.event_type
                ) === "Agricultural"
        ).length;


    const persistent =
        filteredEvents.filter(
            event =>
                String(
                    event.persistence ||
                    event.persistent ||
                    ""
                )
                .toLowerCase() ===
                "persistent"
        ).length;


    setText(
        "total-events",
        total
    );


    setText(
        "industrial-events",
        industrial
    );


    setText(
        "forest-events",
        forest
    );


    setText(
        "agricultural-events",
        agricultural
    );


    setText(
        "persistent-events",
        persistent
    );

}


/* =========================================================
   SAFE TEXT UPDATE
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   EVENT COUNTS
========================================================= */

function updateEventCounts() {

    const count =
        document.getElementById(
            "event-count"
        );


    if (count) {

        count.textContent =
            `${filteredEvents.length} EVENTS`;

    }

}


/* =========================================================
   NORMALIZE EVENT TYPE
========================================================= */

function normalizeType(
    type
) {

    const value =
        String(
            type || ""
        )
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
            "agricultural"
        ) ||
        value.includes(
            "agriculture"
        )
    ) {

        return "Agricultural";

    }


    if (
        value.includes(
            "persistent"
        )
    ) {

        return "Persistent";

    }


    return "Other";

}


/* =========================================================
   EVENT COLOR
========================================================= */

function getEventColor(
    type
) {

    switch (type) {

        case "Industrial":

            return "#ef4444";

        case "Forest/Natural":

            return "#22c55e";

        case "Agricultural":

            return "#f59e0b";

        case "Persistent":

            return "#a855f7";

        default:

            return "#38bdf8";

    }

}


/* =========================================================
   MAP MARKERS
========================================================= */

function renderMapMarkers() {

    if (!markersLayer) {

        return;

    }


    markersLayer.clearLayers();


    filteredEvents.forEach(
        function (
            event
        ) {

            const latitude =
                parseFloat(
                    event.latitude
                );


            const longitude =
                parseFloat(
                    event.longitude
                );


            if (
                Number.isNaN(
                    latitude
                ) ||
                Number.isNaN(
                    longitude
                )
            ) {

                return;

            }


            const type =
                normalizeType(
                    event.event_type
                );


            const color =
                getEventColor(
                    type
                );


            const marker =
                L.circleMarker(
                    [
                        latitude,
                        longitude
                    ],
                    {

                        radius: 7,

                        fillColor:
                            color,

                        color:
                            color,

                        weight: 2,

                        opacity: 0.9,

                        fillOpacity: 0.75

                    }
                );


            marker.bindPopup(
                createPopupContent(
                    event,
                    type
                )
            );


            marker.addTo(
                markersLayer
            );

        }
    );

}


/* =========================================================
   POPUP CONTENT
========================================================= */

function createPopupContent(
    event,
    type
) {

    const confidence =
        getConfidence(
            event
        );


    return `

        <div class="map-popup">

            <div class="popup-title">

                ${escapeHTML(type)}

            </div>


            <div class="popup-row">

                <span>Latitude</span>

                <strong>
                    ${escapeHTML(
                        event.latitude || "—"
                    )}
                </strong>

            </div>


            <div class="popup-row">

                <span>Longitude</span>

                <strong>
                    ${escapeHTML(
                        event.longitude || "—"
                    )}
                </strong>

            </div>


            <div class="popup-row">

                <span>Confidence</span>

                <strong>
                    ${
                        confidence === null
                            ? "—"
                            : confidence.toFixed(1) + "%"
                    }
                </strong>

            </div>


            <div class="popup-row">

                <span>FRP</span>

                <strong>
                    ${escapeHTML(
                        event.mean_frp ||
                        event.frp_mw ||
                        "—"
                    )}
                </strong>

            </div>


        </div>

    `;

}


/* =========================================================
   CONFIDENCE HELPER
========================================================= */

function getConfidence(
    event
) {

    let value =
        event.confidence_pct ??
        event.confidence ??
        event.prediction_confidence ??
        event.probability ??
        event.score;


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }


    value =
        Number(value);


    if (
        Number.isNaN(
            value
        )
    ) {

        return null;

    }


    if (
        value >= 0 &&
        value <= 1
    ) {

        value *= 100;

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
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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
   EVENT TABLE
========================================================= */

function updateEventTable() {

    const tbody =
        document.getElementById(
            "events-body"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = "";


    filteredEvents
        .slice(0, 100)
        .forEach(
            function (
                event
            ) {

                const row =
                    document.createElement(
                        "tr"
                    );


                const type =
                    normalizeType(
                        event.event_type
                    );


                const confidence =
                    getConfidence(
                        event
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHTML(
                            event.event_id ||
                            event.source_id ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            event.latitude ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            event.longitude ||
                            "—"
                        )}
                    </td>

                    <td>
                        <span
                            class="event-badge"
                            style="border-color:${getEventColor(type)}"
                        >
                            ${escapeHTML(type)}
                        </span>
                    </td>

                    <td>
                        ${
                            confidence === null
                                ? "—"
                                : confidence.toFixed(1) + "%"
                        }
                    </td>

                    <td>
                        ${escapeHTML(
                            event.acq_date ||
                            event.detection_date ||
                            "—"
                        )}
                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );

}


/* =========================================================
   FILTER SETUP
========================================================= */

function setupEventListeners() {

    const eventTypeFilter =
        document.getElementById(
            "event-type-filter"
        );


    if (eventTypeFilter) {

        eventTypeFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    const landcoverFilter =
        document.getElementById(
            "landcover-filter"
        );


    if (landcoverFilter) {

        landcoverFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    const confidenceFilter =
        document.getElementById(
            "confidence-filter"
        );


    if (confidenceFilter) {

        confidenceFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    const searchInput =
        document.getElementById(
            "search-input"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
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
            resetFilters
        );

    }


    document
        .getElementById(
            "alert-button"
        )
        ?.addEventListener(
            "click",
            toggleAlertCenter
        );


    document
        .getElementById(
            "close-alerts"
        )
        ?.addEventListener(
            "click",
            toggleAlertCenter
        );

}


/* =========================================================
   FILTER EVENTS
========================================================= */

function applyFilters() {

    const typeFilter =
        document.getElementById(
            "event-type-filter"
        )?.value || "all";


    const landcoverFilter =
        document.getElementById(
            "landcover-filter"
        )?.value || "all";


    const confidenceFilter =
        document.getElementById(
            "confidence-filter"
        )?.value || "all";


    const search =
        document.getElementById(
            "search-input"
        )?.value
        .trim()
        .toLowerCase() || "";


    filteredEvents =
        allEvents.filter(
            function (
                event
            ) {

                const type =
                    normalizeType(
                        event.event_type
                    );


                if (
                    typeFilter !== "all" &&
                    type.toLowerCase() !==
                    typeFilter.toLowerCase()
                ) {

                    return false;

                }


                const landcover =
                    String(
                        event.landcover_class ||
                        event.landcover ||
                        ""
                    )
                    .toLowerCase();


                if (
                    landcoverFilter !== "all" &&
                    landcover !==
                    landcoverFilter.toLowerCase()
                ) {

                    return false;

                }


                const confidence =
                    getConfidence(
                        event
                    );


                if (
                    confidenceFilter !== "all" &&
                    confidence !== null
                ) {

                    const threshold =
                        Number(
                            confidenceFilter
                        );


                    if (
                        confidence <
                        threshold
                    ) {

                        return false;

                    }

                }


                if (
                    search &&
                    !JSON.stringify(
                        event
                    )
                    .toLowerCase()
                    .includes(
                        search
                    )
                ) {

                    return false;

                }


                return true;

            }
        );


    updateDashboard();

    renderMapMarkers();

}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {

    const ids = [

        "event-type-filter",

        "landcover-filter",

        "confidence-filter",

        "search-input"

    ];


    ids.forEach(
        function (
            id
        ) {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {

                return;

            }


            if (
                element.tagName ===
                "SELECT"
            ) {

                element.value =
                    "all";

            }

            else {

                element.value =
                    "";

            }

        }
    );


    filteredEvents =
        [...allEvents];


    updateDashboard();

    renderMapMarkers();

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
        async function (
            event
        ) {

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


        showPredictionError(
            "Backend connection failed. Please verify that the deployed AI backend is online and that CORS allows this GitHub Pages site."
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
        result.probability ??
        result.score ??
        result.data?.confidence_pct ??
        result.data?.confidence ??
        result.result?.confidence_pct ??
        result.result?.confidence ??
        0;


    confidence = Number(
        confidence
    );


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


    addPredictionAlert(
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


/* =========================================================
   ALERT SYSTEM
========================================================= */

function addPredictionAlert(
    confidence
) {

    const level =
        getAlertLevel(
            confidence
        );


    if (
        level === "none"
    ) {

        return;

    }


    const now =
        new Date();


    alerts.unshift({

        id:
            Date.now(),

        level:
            level,

        confidence:
            confidence,

        timestamp:
            now,

        message:
            getAlertMessage(
                level,
                confidence
            )

    });


    /*
       Keep only the latest 20 alerts.
    */

    if (
        alerts.length > 20
    ) {

        alerts =
            alerts.slice(
                0,
                20
            );

    }


    updateAlertBadge();

    renderAlertCenter();

}


/* =========================================================
   ALERT LEVEL
========================================================= */

function getAlertLevel(
    confidence
) {

    if (
        confidence >=
        ALERT_THRESHOLDS.critical
    ) {

        return "critical";

    }


    if (
        confidence >=
        ALERT_THRESHOLDS.high
    ) {

        return "high";

    }


    if (
        confidence >=
        ALERT_THRESHOLDS.monitor
    ) {

        return "monitor";

    }


    return "none";

}


/* =========================================================
   ALERT MESSAGE
========================================================= */

function getAlertMessage(
    level,
    confidence
) {

    const formatted =
        confidence.toFixed(
            1
        );


    switch (level) {

        case "critical":

            return `CRITICAL: High-confidence thermal event detected (${formatted}%). Immediate attention recommended.`;

        case "high":

            return `HIGH ALERT: Thermal event detected with ${formatted}% confidence.`;

        case "monitor":

            return `MONITOR: Thermal anomaly detected with ${formatted}% confidence.`;

        default:

            return "";

    }

}


/* =========================================================
   UPDATE ALERT BADGE
========================================================= */

function updateAlertBadge() {

    const badge =
        document.getElementById(
            "alert-count"
        );


    if (!badge) {

        return;

    }


    const criticalCount =
        alerts.filter(
            alert =>
                alert.level ===
                "critical"
        ).length;


    badge.textContent =
        criticalCount ||
        alerts.length;


    if (
        alerts.length === 0
    ) {

        badge.classList.add(
            "hidden"
        );

    }

    else {

        badge.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   TOGGLE ALERT CENTER
========================================================= */

function toggleAlertCenter() {

    const panel =
        document.getElementById(
            "alert-center"
        );


    if (!panel) {

        return;

    }


    panel.classList.toggle(
        "hidden"
    );


    if (
        !panel.classList.contains(
            "hidden"
        )
    ) {

        renderAlertCenter();

    }

}


/* =========================================================
   RENDER ALERT CENTER
========================================================= */

function renderAlertCenter() {

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

            <div class="empty-alerts">

                <i class="fa-solid fa-shield-check"></i>

                <p>
                    No active alerts
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        alerts
            .map(
                function (
                    alert
                ) {

                    const time =
                        alert.timestamp
                            .toLocaleTimeString();


                    return `

                        <div
                            class="alert-item alert-${alert.level}"
                        >

                            <div
                                class="alert-icon"
                            >

                                <i class="fa-solid fa-triangle-exclamation"></i>

                            </div>


                            <div
                                class="alert-content"
                            >

                                <div
                                    class="alert-title"
                                >

                                    ${escapeHTML(
                                        alert.level.toUpperCase()
                                    )}

                                </div>


                                <div
                                    class="alert-message"
                                >

                                    ${escapeHTML(
                                        alert.message
                                    )}

                                </div>


                                <div
                                    class="alert-time"
                                >

                                    ${escapeHTML(
                                        time
                                    )}

                                </div>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   CLEAR ALERTS
========================================================= */

function clearAlerts() {

    alerts = [];

    updateAlertBadge();

    renderAlertCenter();

}


/* =========================================================
   KEYBOARD SUPPORT
========================================================= */

document.addEventListener(
    "keydown",
    function (
        event
    ) {

        if (
            event.key ===
            "Escape"
        ) {

            const panel =
                document.getElementById(
                    "alert-center"
                );


            if (
                panel &&
                !panel.classList.contains(
                    "hidden"
                )
            ) {

                panel.classList.add(
                    "hidden"
                );

            }

        }

    }
);


/* =========================================================
   MAP EVENT INTERACTION
========================================================= */

function focusEventOnMap(
    event
) {

    if (
        !map
    ) {

        return;

    }


    const latitude =
        parseFloat(
            event.latitude
        );


    const longitude =
        parseFloat(
            event.longitude
        );


    if (
        Number.isNaN(
            latitude
        ) ||
        Number.isNaN(
            longitude
        )
    ) {

        return;

    }


    map.setView(
        [
            latitude,
            longitude
        ],
        10
    );

}


/* =========================================================
   MAP LEGEND
========================================================= */

function createMapLegend() {

    const legend =
        L.control({
            position:
                "bottomright"
        });


    legend.onAdd =
        function () {

            const div =
                L.DomUtil.create(
                    "div",
                    "map-legend"
                );


            div.innerHTML = `

                <div class="legend-title">
                    EVENT TYPES
                </div>


                <div class="legend-item">

                    <span
                        class="legend-dot"
                        style="background:#ef4444"
                    ></span>

                    Industrial

                </div>


                <div class="legend-item">

                    <span
                        class="legend-dot"
                        style="background:#22c55e"
                    ></span>

                    Forest / Natural

                </div>


                <div class="legend-item">

                    <span
                        class="legend-dot"
                        style="background:#f59e0b"
                    ></span>

                    Agricultural

                </div>


                <div class="legend-item">

                    <span
                        class="legend-dot"
                        style="background:#a855f7"
                    ></span>

                    Persistent

                </div>

            `;


            return div;

        };


    legend.addTo(
        map
    );

}


try {

    if (
        typeof L !==
        "undefined"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                if (map) {

                    createMapLegend();

                }

            }
        );

    }

}

catch (
    error
) {

    console.error(
        error
    );

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function formatNumber(
    value,
    decimals = 2
) {

    const number =
        Number(value);


    if (
        Number.isNaN(
            number
        )
    ) {

        return "—";

    }


    return number.toFixed(
        decimals
    );

}


/* =========================================================
   CONFIDENCE CLASS
========================================================= */

function getConfidenceClass(
    confidence
) {

    if (
        confidence >= 85
    ) {

        return "critical";

    }


    if (
        confidence >= 70
    ) {

        return "high";

    }


    if (
        confidence >= 50
    ) {

        return "medium";

    }


    return "low";

}


/* =========================================================
   DATE FORMATTER
========================================================= */

function formatDate(
    value
) {

    if (!value) {

        return "—";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleDateString(
        "en-IN",
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"

        }
    );

}


/* =========================================================
   SIDEBAR / NAVIGATION
========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            "[data-section]"
        );


    navItems.forEach(
        function (
            item
        ) {

            item.addEventListener(
                "click",
                function () {

                    const section =
                        item.dataset.section;


                    document
                        .querySelectorAll(
                            ".dashboard-section"
                        )
                        .forEach(
                            function (
                                element
                            ) {

                                element.classList
                                    .remove(
                                        "active"
                                    );

                            }
                        );


                    const target =
                        document.getElementById(
                            section
                        );


                    if (target) {

                        target.classList.add(
                            "active"
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   AUTO INITIALIZE NAVIGATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupNavigation();

    }
);


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    function () {

        if (
            map
        ) {

            setTimeout(
                function () {

                    map.invalidateSize();

                },
                200
            );

        }

    }
);


/* =========================================================
   CONSOLE INFORMATION
========================================================= */

console.log(
    "%cAI Thermal Event Intelligence Dashboard",
    "font-size:18px;font-weight:bold;"
);


console.log(
    "Backend:",
    BACKEND_URL
);


console.log(
    "Alert thresholds:",
    ALERT_THRESHOLDS
);
/* =========================================================
   ADVANCED ALERT HELPERS
========================================================= */

function getAlertPriority(
    level
) {

    switch (level) {

        case "critical":

            return 3;

        case "high":

            return 2;

        case "monitor":

            return 1;

        default:

            return 0;

    }

}


/* =========================================================
   SORT ALERTS
========================================================= */

function sortAlerts() {

    alerts.sort(
        function (
            a,
            b
        ) {

            const priorityDifference =
                getAlertPriority(
                    b.level
                ) -
                getAlertPriority(
                    a.level
                );


            if (
                priorityDifference !==
                0
            ) {

                return priorityDifference;

            }


            return (
                b.timestamp.getTime() -
                a.timestamp.getTime()
            );

        }
    );

}


/* =========================================================
   ALERT SOUND
========================================================= */

function playAlertSound(
    level
) {

    /*
       Browser audio may be blocked until
       the user interacts with the page.
    */

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (
            !AudioContext
        ) {

            return;

        }


        const context =
            new AudioContext();


        const oscillator =
            context.createOscillator();


        const gain =
            context.createGain();


        oscillator.connect(
            gain
        );


        gain.connect(
            context.destination
        );


        oscillator.frequency.value =
            level === "critical"
                ? 880
                : level === "high"
                    ? 660
                    : 440;


        gain.gain.value =
            0.04;


        oscillator.start();


        setTimeout(
            function () {

                oscillator.stop();

                context.close();

            },
            180
        );

    }

    catch (
        error
    ) {

        console.warn(
            "Alert sound unavailable:",
            error
        );

    }

}


/* =========================================================
   NOTIFICATION
========================================================= */

function showBrowserNotification(
    alert
) {

    if (
        !("Notification" in window)
    ) {

        return;

    }


    if (
        Notification.permission ===
        "granted"
    ) {

        new Notification(
            `Thermal Intelligence — ${alert.level.toUpperCase()}`,
            {

                body:
                    alert.message,

                tag:
                    "thermal-alert"

            }
        );

    }

}


/* =========================================================
   REQUEST NOTIFICATION PERMISSION
========================================================= */

function requestNotificationPermission() {

    if (
        !("Notification" in window)
    ) {

        return;

    }


    if (
        Notification.permission ===
        "default"
    ) {

        Notification.requestPermission();

    }

}


/* =========================================================
   ENHANCED PREDICTION ALERT
========================================================= */

function triggerPredictionAlert(
    prediction,
    confidence
) {

    const level =
        getAlertLevel(
            confidence
        );


    if (
        level === "none"
    ) {

        return;

    }


    const alert = {

        id:
            Date.now(),

        level:
            level,

        confidence:
            confidence,

        prediction:
            prediction,

        timestamp:
            new Date(),

        message:
            `${prediction} detected with ${confidence.toFixed(1)}% confidence.`

    };


    alerts.unshift(
        alert
    );


    if (
        alerts.length > 20
    ) {

        alerts.pop();

    }


    sortAlerts();

    updateAlertBadge();

    renderAlertCenter();

    playAlertSound(
        level
    );

    showBrowserNotification(
        alert
    );

}


/* =========================================================
   CONFIDENCE VISUALIZATION
========================================================= */

function updateConfidenceVisualization(
    confidence
) {

    const fill =
        document.getElementById(
            "result-confidence-fill"
        );


    const value =
        document.getElementById(
            "result-confidence-value"
        );


    if (
        !fill ||
        !value
    ) {

        return;

    }


    const safeConfidence =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    confidence
                ) || 0
            )
        );


    fill.style.width =
        `${safeConfidence}%`;


    value.textContent =
        `${safeConfidence.toFixed(1)}%`;


    fill.classList.remove(
        "confidence-low",
        "confidence-medium",
        "confidence-high",
        "confidence-critical"
    );


    if (
        safeConfidence >= 85
    ) {

        fill.classList.add(
            "confidence-critical"
        );

    }

    else if (
        safeConfidence >= 70
    ) {

        fill.classList.add(
            "confidence-high"
        );

    }

    else if (
        safeConfidence >= 50
    ) {

        fill.classList.add(
            "confidence-medium"
        );

    }

    else {

        fill.classList.add(
            "confidence-low"
        );

    }

}


/* =========================================================
   BACKEND RESPONSE NORMALIZER
========================================================= */

function normalizeBackendResponse(
    result
) {

    if (
        !result
    ) {

        return {

            prediction:
                "Other",

            confidence:
                0

        };

    }


    let prediction =
        result.predicted_event_type ||
        result.event_type ||
        result.prediction ||
        result.classification ||
        result.label ||
        result.class ||
        result.data?.prediction ||
        result.data?.event_type ||
        result.result?.prediction ||
        result.result?.event_type ||
        "Other";


    let confidence =
        result.confidence_pct ??
        result.confidence ??
        result.prediction_confidence ??
        result.probability ??
        result.score ??
        result.data?.confidence_pct ??
        result.data?.confidence ??
        result.result?.confidence_pct ??
        result.result?.confidence ??
        0;


    confidence =
        Number(
            confidence
        );


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


    return {

        prediction:
            normalizeType(
                prediction
            ),

        confidence:
            confidence

    };

}


/* =========================================================
   BACKEND HEALTH CHECK
========================================================= */

async function checkBackendHealth() {

    /*
       The prediction endpoint may not support GET.
       Therefore this function only reports availability
       when the backend responds.
    */

    try {

        const response =
            await fetch(
                BACKEND_URL,
                {

                    method:
                        "OPTIONS"

                }
            );


        console.log(
            "Backend response:",
            response.status
        );


        return true;

    }

    catch (
        error
    ) {

        console.warn(
            "Backend health check failed:",
            error
        );


        return false;

    }

}


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

window.addEventListener(
    "error",
    function (
        event
    ) {

        console.error(
            "Dashboard error:",
            event.error ||
            event.message
        );

    }
);


/* =========================================================
   UNHANDLED PROMISE HANDLER
========================================================= */

window.addEventListener(
    "unhandledrejection",
    function (
        event
    ) {

        console.error(
            "Unhandled promise rejection:",
            event.reason
        );

    }
);


/* =========================================================
   FINAL INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        requestNotificationPermission();

        updateAlertBadge();

        renderAlertCenter();

    }
);


/* =========================================================
   DEBUG INFORMATION
========================================================= */

function dashboardDebugInfo() {

    return {

        backend:
            BACKEND_URL,

        totalEvents:
            allEvents.length,

        filteredEvents:
            filteredEvents.length,

        activeAlerts:
            alerts.length,

        alertThresholds:
            ALERT_THRESHOLDS

    };

}


window.dashboardDebugInfo =
    dashboardDebugInfo;


/* =========================================================
   END OF AI THERMAL EVENT INTELLIGENCE DASHBOARD
========================================================= */
