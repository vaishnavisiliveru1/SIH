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

const ALERT_THRESHOLDS = {
    CRITICAL: 80,
    HIGH: 60
};


/* =========================================================
   GLOBAL STATE
========================================================= */

let selectedEvent = null;
let persistenceMap = new Map();

let currentPage = 1;
const rowsPerPage = 10;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeDashboard();

});


/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */

async function initializeDashboard() {

    try {

        initializeMap();
        initializeNavigation();
        initializeFilters();
        initializePredictionForm();
        initializeTableEvents();

        await loadDashboardData();

    } catch (error) {

        console.error(
            "Dashboard initialization error:",
            error
        );

    }

}


/* =========================================================
   CSV LOADING
========================================================= */

async function loadCSVWithFallback(paths) {

    for (const path of paths) {

        try {

            const response = await fetch(path, {
                cache: "no-store"
            });

            if (!response.ok) {
                continue;
            }

            const text = await response.text();

            if (!text.trim()) {
                continue;
            }

            return text;

        } catch (error) {

            console.warn(
                `Unable to load CSV: ${path}`,
                error
            );

        }

    }

    throw new Error(
        "Unable to load CSV from available paths."
    );

}


/* =========================================================
   LOAD DASHBOARD DATA
========================================================= */

async function loadDashboardData() {

    try {

        /*
         * Main classification dataset.
         *
         * event_classification_features.csv is preferred.
         * predictions.csv is kept as fallback so the
         * dashboard still works with the older dataset.
         */

        const classificationCSV =
            await loadCSVWithFallback([

                "event_classification_features.csv",
                "./event_classification_features.csv",

                "frontend/event_classification_features.csv",
                "./frontend/event_classification_features.csv",

                "data/event_classification_features.csv",
                "./data/event_classification_features.csv",

                "predictions.csv",
                "./predictions.csv"

            ]);


        /*
         * Persistence dataset.
         */

        let persistenceCSV = "";

        try {

            persistenceCSV =
                await loadCSVWithFallback([

                    "source_persistence_features.csv",
                    "./source_persistence_features.csv",

                    "frontend/source_persistence_features.csv",
                    "./frontend/source_persistence_features.csv",

                    "data/source_persistence_features.csv",
                    "./data/source_persistence_features.csv"

                ]);

        } catch (error) {

            console.warn(
                "Persistence CSV could not be loaded.",
                error
            );

        }


        const classificationData =
            parseCSV(classificationCSV);

        const persistenceData =
            persistenceCSV
                ? parseCSV(persistenceCSV)
                : [];


        processData(
            classificationData,
            persistenceData
        );


        updateDashboard();

    } catch (error) {

        console.error(
            "Failed to load event classification data:",
            error
        );

        showDataError(
            "Could not load event classification data."
        );

    }

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

        } else if (char === '"') {

            insideQuotes = !insideQuotes;

        } else if (char === "," && !insideQuotes) {

            row.push(value);
            value = "";

        } else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(value);
            value = "";

            if (
                row.some(
                    cell =>
                        String(cell).trim() !== ""
                )
            ) {
                rows.push(row);
            }

            row = [];

        } else {

            value += char;

        }

    }


    if (value !== "" || row.length > 0) {

        row.push(value);

        if (
            row.some(
                cell =>
                    String(cell).trim() !== ""
            )
        ) {
            rows.push(row);
        }

    }


    if (rows.length === 0) {
        return [];
    }


    const headers =
        rows[0].map(
            header =>
                String(header)
                    .trim()
                    .replace(/^"|"$/g, "")
        );


    return rows
        .slice(1)
        .map(row => {

            const object = {};

            headers.forEach(
                (header, index) => {

                    object[header] =
                        row[index] !== undefined
                            ? String(row[index]).trim()
                            : "";

                }
            );

            return object;

        });

}


/* =========================================================
   DATA PROCESSING
========================================================= */

function processData(
    data,
    persistenceData = []
) {

    persistenceMap = new Map();


    /*
     * Store persistence information using source_id.
     */

    persistenceData.forEach(row => {

        const sourceId =
            getValue(
                row,
                [
                    "source_id",
                    "SOURCE_ID",
                    "Source ID"
                ]
            );

        if (
            sourceId !== null &&
            sourceId !== undefined &&
            String(sourceId).trim() !== ""
        ) {

            persistenceMap.set(
                String(sourceId).trim(),
                row
            );

        }

    });


    allEvents =
        data.map(
            (row, index) =>
                normalizeEvent(
                    row,
                    index
                )
        );


    /*
     * Attach persistence information.
     */

    applyPersistenceData(allEvents);


    filteredEvents =
        [...allEvents];


    currentPage = 1;


    updateCounts();
    updateTable();
    updateMap();
    updateAlerts();

}


/* =========================================================
   APPLY PERSISTENCE DATA
========================================================= */

function applyPersistenceData(events) {

    events.forEach(event => {

        const key =
            String(event.source_id)
                .trim();


        const persistence =
            persistenceMap.get(key);


        if (!persistence) {
            return;
        }


        const score =
            parsePersistenceScore(
                getValue(
                    persistence,
                    [
                        "persistence_score",
                        "Persistence Score",
                        "persistence"
                    ]
                )
            );


        const flag =
            getValue(
                persistence,
                [
                    "persistent_flag",
                    "Persistent Flag"
                ]
            );


        const category =
            getValue(
                persistence,
                [
                    "persistence_category",
                    "Persistence Category"
                ]
            );


        event.persistence_score =
            score;


        event.persistent_flag =
            flag;


        event.persistence_category =
            category;


        event.persistence =
            formatPersistence(
                score,
                category
            );

    });

}


/* =========================================================
   NORMALIZE EVENT
========================================================= */

function normalizeEvent(
    row,
    index
) {

    const sourceId =
        getValue(
            row,
            [
                "source_id",
                "SOURCE_ID",
                "Source ID",
                "source id"
            ]
        ) || `EVENT-${index + 1}`;


    const classification =
        getValue(
            row,
            [
                "classification",
                "predicted_class",
                "prediction",
                "ai_classification",
                "AI Classification",
                "class",
                "label"
            ]
        ) || "Other";


    const confidence =
        parseConfidence(
            getValue(
                row,
                [
                    "confidence",
                    "Confidence",
                    "confidence_pct",
                    "confidence_percent",
                    "model_confidence",
                    "prediction_confidence"
                ]
            )
        );


    const latitude =
        parseFloat(
            getValue(
                row,
                [
                    "latitude",
                    "Latitude",
                    "lat",
                    "LATITUDE"
                ]
            )
        );


    const longitude =
        parseFloat(
            getValue(
                row,
                [
                    "longitude",
                    "Longitude",
                    "lon",
                    "lng",
                    "LONGITUDE"
                ]
            )
        );


    const landCover =
        getValue(
            row,
            [
                "land_cover",
                "Land Cover",
                "landcover",
                "land_cover_type"
            ]
        ) || "Unknown";


    const meanFRP =
        parseFloat(
            getValue(
                row,
                [
                    "mean_frp",
                    "Mean FRP",
                    "mean_frp_mw",
                    "Mean FRP (MW)",
                    "frp"
                ]
            )
        );


    const maxFRP =
        parseFloat(
            getValue(
                row,
                [
                    "max_frp",
                    "Maximum FRP",
                    "max_frp_mw",
                    "Maximum FRP (MW)"
                ]
            )
        );


    const date =
        getValue(
            row,
            [
                "date",
                "Date",
                "acq_date",
                "event_date"
            ]
        );


    const time =
        getValue(
            row,
            [
                "time",
                "Time",
                "acq_time",
                "event_time"
            ]
        );


    const event = {

        ...row,

        index,

        source_id:
            String(sourceId).trim(),

        classification:
            normalizeClassification(
                classification
            ),

        confidence,

        latitude,

        longitude,

        land_cover:
            landCover,

        mean_frp:
            Number.isFinite(meanFRP)
                ? meanFRP
                : null,

        max_frp:
            Number.isFinite(maxFRP)
                ? maxFRP
                : null,

        date,

        time,

        persistence_score:
            null,

        persistent_flag:
            null,

        persistence_category:
            null,

        persistence:
            "—"

    };


    return event;

}


/* =========================================================
   VALUE HELPER
========================================================= */

function getValue(
    object,
    possibleKeys
) {

    for (const key of possibleKeys) {

        if (
            Object.prototype.hasOwnProperty.call(
                object,
                key
            )
        ) {

            const value =
                object[key];

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {

                return value;

            }

        }

    }


    /*
     * Case-insensitive fallback.
     */

    const objectKeys =
        Object.keys(object);


    for (const requestedKey of possibleKeys) {

        const matchingKey =
            objectKeys.find(
                actualKey =>
                    actualKey
                        .toLowerCase()
                        .trim() ===
                    String(requestedKey)
                        .toLowerCase()
                        .trim()
            );


        if (matchingKey) {

            const value =
                object[matchingKey];


            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {

                return value;

            }

        }

    }


    return null;

}


/* =========================================================
   CLASSIFICATION NORMALIZATION
========================================================= */

function normalizeClassification(
    classification
) {

    const value =
        String(classification)
            .trim()
            .toLowerCase();


    if (
        value.includes("industrial")
    ) {
        return "Industrial";
    }


    if (
        value.includes("forest") ||
        value.includes("natural") ||
        value.includes("wildfire")
    ) {
        return "Forest/Natural";
    }


    if (
        value.includes("agricultural") ||
        value.includes("agriculture") ||
        value.includes("crop")
    ) {
        return "Agricultural";
    }


    return "Other";

}


/* =========================================================
   CONFIDENCE PARSER
========================================================= */

function parseConfidence(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        /*
         * Do NOT invent demo confidence.
         * Confidence must come from the
         * classification CSV.
         */

        return null;

    }


    let number =
        parseFloat(
            String(value)
                .replace("%", "")
                .trim()
        );


    if (!Number.isFinite(number)) {
        return null;
    }


    /*
     * If the CSV stores confidence as a
     * fraction such as 0.87, convert it
     * to percentage.
     */

    if (
        number >= 0 &&
        number <= 1
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
   PERSISTENCE SCORE PARSER
========================================================= */

function parsePersistenceScore(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return null;

    }


    const score =
        parseFloat(
            String(value)
                .replace("%", "")
                .trim()
        );


    if (!Number.isFinite(score)) {
        return null;
    }


    return score;

}


/* =========================================================
   PERSISTENCE FORMATTING
========================================================= */

function formatPersistenceScore(
    score
) {

    if (
        score === null ||
        score === undefined ||
        !Number.isFinite(score)
    ) {

        return "—";

    }


    return score.toFixed(3);

}


/* =========================================================
   FORMAT PERSISTENCE
========================================================= */

function formatPersistence(
    score,
    category
) {

    if (
        score === null ||
        score === undefined ||
        !Number.isFinite(score)
    ) {

        if (
            category &&
            String(category).trim() !== ""
        ) {

            return String(category);

        }

        return "—";

    }


    const formattedScore =
        formatPersistenceScore(score);


    if (
        category &&
        String(category).trim() !== ""
    ) {

        return `${formattedScore} (${category})`;

    }


    return formattedScore;

}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {

    updateCounts();
    updateTable();
    updateMap();
    updateAlerts();

}


/* =========================================================
   UPDATE COUNTS
========================================================= */

function updateCounts() {

    const counts = {

        Industrial: 0,

        "Forest/Natural": 0,

        Agricultural: 0,

        Other: 0

    };


    allEvents.forEach(event => {

        if (
            counts[
                event.classification
            ] !== undefined
        ) {

            counts[
                event.classification
            ]++;

        }

    });


    setElementText(
        "industrial-count",
        counts.Industrial
    );


    setElementText(
        "forest-count",
        counts["Forest/Natural"]
    );


    setElementText(
        "agricultural-count",
        counts.Agricultural
    );


    setElementText(
        "other-count",
        counts.Other
    );


    /*
     * Support alternate count IDs
     * that may already exist in the HTML.
     */

    setElementText(
        "industrial-events",
        counts.Industrial
    );


    setElementText(
        "forest-events",
        counts["Forest/Natural"]
    );


    setElementText(
        "agricultural-events",
        counts.Agricultural
    );


    setElementText(
        "other-events",
        counts.Other
    );

}


/* =========================================================
   SET ELEMENT TEXT
========================================================= */

function setElementText(
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
   TABLE
========================================================= */

function updateTable() {

    const tbody =
        document.getElementById(
            "event-table-body"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredEvents.length /
                rowsPerPage
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const start =
        (currentPage - 1) *
        rowsPerPage;


    const end =
        start + rowsPerPage;


    const pageEvents =
        filteredEvents.slice(
            start,
            end
        );


    if (pageEvents.length === 0) {

        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td colspan="9" class="empty-state">
                No events found
            </td>
        `;


        tbody.appendChild(row);


        updatePagination(
            0,
            0
        );

        return;

    }


    pageEvents.forEach(
        event => {

            const row =
                document.createElement("tr");


            const confidence =
                formatConfidence(
                    event.confidence
                );


            const persistence =
                formatPersistence(
                    event.persistence_score,
                    event.persistence_category
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        event.source_id
                    )}
                </td>

                <td>
                    <span class="classification-badge ${getClassificationClass(
                        event.classification
                    )}">
                        ${escapeHTML(
                            event.classification
                        )}
                    </span>
                </td>

                <td>
                    ${confidence}
                </td>

                <td>
                    ${formatNumber(
                        event.latitude,
                        4
                    )}
                </td>

                <td>
                    ${formatNumber(
                        event.longitude,
                        4
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        event.land_cover ||
                        "Unknown"
                    )}
                </td>

                <td>
                    ${formatFRP(
                        event.mean_frp
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        persistence
                    )}
                </td>

                <td>
                    <button
                        class="table-action-btn"
                        data-source-id="${escapeHTMLAttribute(
                            event.source_id
                        )}"
                    >
                        VIEW
                    </button>
                </td>

            `;


            tbody.appendChild(row);

        }
    );


    updatePagination(
        currentPage,
        totalPages
    );

}


/* =========================================================
   TABLE EVENT LISTENERS
========================================================= */

function initializeTableEvents() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".table-action-btn"
                );


            if (!button) {
                return;
            }


            const sourceId =
                button.dataset.sourceId;


            const selected =
                allEvents.find(
                    item =>
                        String(
                            item.source_id
                        ) ===
                        String(
                            sourceId
                        )
                );


            if (selected) {

                selectEvent(
                    selected
                );

            }

        }
    );

}


/* =========================================================
   SELECT EVENT
========================================================= */

function selectEvent(event) {

    selectedEvent =
        event;


    updateSelectedEventPanel(
        event
    );


    if (
        map &&
        Number.isFinite(event.latitude) &&
        Number.isFinite(event.longitude)
    ) {

        map.setView(
            [
                event.latitude,
                event.longitude
            ],
            10
        );

    }

}


/* =========================================================
   SELECTED EVENT DETAILS
========================================================= */

function updateSelectedEventPanel(
    event
) {

    const container =
        document.getElementById(
            "selected-event-details"
        );


    if (!container) {
        return;
    }


    const confidence =
        formatConfidence(
            event.confidence
        );


    const persistence =
        formatPersistence(
            event.persistence_score,
            event.persistence_category
        );


    container.innerHTML = `

        <div class="detail-row">
            <span>SOURCE ID</span>
            <strong>
                ${escapeHTML(
                    event.source_id
                )}
            </strong>
        </div>

        <div class="detail-row">
            <span>AI CLASSIFICATION</span>
            <strong>
                ${escapeHTML(
                    event.classification
                )}
            </strong>
        </div>

        <div class="detail-row">
            <span>CONFIDENCE</span>
            <strong>
                ${confidence}
            </strong>
        </div>

        <div class="detail-row">
            <span>LATITUDE</span>
            <strong>
                ${formatNumber(
                    event.latitude,
                    6
                )}
            </strong>
        </div>

        <div class="detail-row">
            <span>LONGITUDE</span>
            <strong>
                ${formatNumber(
                    event.longitude,
                    6
                )}
            </strong>
        </div>

        <div class="detail-row">
            <span>LAND COVER</span>
            <strong>
                ${escapeHTML(
                    event.land_cover ||
                    "Unknown"
                )}
            </strong>
        </div>

        <div class="detail-row">
            <span>MEAN FRP</span>
            <strong>
                ${formatFRP(
                    event.mean_frp
                )}
            </strong>
        </div>

        <div class="detail-row">
            <span>PERSISTENCE SCORE</span>
            <strong>
                ${formatPersistenceScore(
                    event.persistence_score
                )}
            </strong>
        </div>

        <div class="detail-row">
            <span>PERSISTENCE CATEGORY</span>
            <strong>
                ${escapeHTML(
                    event.persistence_category ||
                    "—"
                )}
            </strong>
        </div>

    `;

}


/* =========================================================
   CONFIDENCE FORMATTING
========================================================= */

function formatConfidence(
    confidence
) {

    if (
        confidence === null ||
        confidence === undefined ||
        !Number.isFinite(confidence)
    ) {

        return "—";

    }


    return `${confidence.toFixed(1)}%`;

}


/* =========================================================
   NUMBER FORMATTING
========================================================= */

function formatNumber(
    value,
    decimals = 2
) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value)
        )
    ) {

        return "—";

    }


    return Number(value)
        .toFixed(decimals);

}


/* =========================================================
   FRP FORMATTING
========================================================= */

function formatFRP(
    value
) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value)
        )
    ) {

        return "—";

    }


    return `${Number(value).toFixed(2)} MW`;

}


/* =========================================================
   CLASSIFICATION CSS CLASS
========================================================= */

function getClassificationClass(
    classification
) {

    switch (
        classification
    ) {

        case "Industrial":
            return "industrial";

        case "Forest/Natural":
            return "forest";

        case "Agricultural":
            return "agricultural";

        default:
            return "other";

    }

}


/* =========================================================
   PAGINATION
========================================================= */

function updatePagination(
    page,
    totalPages
) {

    const pageNumber =
        document.getElementById(
            "page-number"
        );


    const previous =
        document.getElementById(
            "prev-page"
        );


    const next =
        document.getElementById(
            "next-page"
        );


    if (pageNumber) {

        pageNumber.textContent =
            totalPages > 0
                ? `${page} / ${totalPages}`
                : "0 / 0";

    }


    if (previous) {

        previous.disabled =
            page <= 1;

    }


    if (next) {

        next.disabled =
            page >= totalPages;

    }

}


/* =========================================================
   PAGINATION BUTTONS
========================================================= */

function goToPreviousPage() {

    if (currentPage > 1) {

        currentPage--;

        updateTable();

    }

}


function goToNextPage() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredEvents.length /
                rowsPerPage
            )
        );


    if (
        currentPage <
        totalPages
    ) {

        currentPage++;

        updateTable();

    }

}


/* =========================================================
   MAP INITIALIZATION
========================================================= */

function initializeMap() {

    const mapElement =
        document.getElementById(
            "map"
        );


    if (
        !mapElement ||
        typeof L === "undefined"
    ) {

        return;

    }


    map =
        L.map(
            "map",
            {
                zoomControl: true
            }
        )
        .setView(
            [20.5937, 78.9629],
            5
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);


    markersLayer =
        L.layerGroup()
            .addTo(map);

}


/* =========================================================
   UPDATE MAP
========================================================= */

function updateMap() {

    if (
        !map ||
        !markersLayer
    ) {

        return;

    }


    markersLayer.clearLayers();


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


            const marker =
                L.circleMarker(
                    [
                        event.latitude,
                        event.longitude
                    ],
                    {
                        radius: 7,
                        weight: 2,
                        fillOpacity: 0.8
                    }
                );


            marker.bindPopup(
                createMapPopup(
                    event
                )
            );


            marker.on(
                "click",
                () => {

                    selectEvent(
                        event
                    );

                }
            );


            marker.addTo(
                markersLayer
            );

        }
    );


    if (
        filteredEvents.length > 0
    ) {

        const validEvents =
            filteredEvents.filter(
                event =>
                    Number.isFinite(
                        event.latitude
                    ) &&
                    Number.isFinite(
                        event.longitude
                    )
            );


        if (
            validEvents.length > 0
        ) {

            const bounds =
                L.latLngBounds(
                    validEvents.map(
                        event => [
                            event.latitude,
                            event.longitude
                        ]
                    )
                );


            map.fitBounds(
                bounds,
                {
                    padding: [30, 30],
                    maxZoom: 10
                }
            );

        }

    }

}


/* =========================================================
   MAP POPUP
========================================================= */

function createMapPopup(
    event
) {

    const confidence =
        formatConfidence(
            event.confidence
        );


    const persistence =
        formatPersistence(
            event.persistence_score,
            event.persistence_category
        );


    return `

        <div class="map-popup">

            <h3>
                ${escapeHTML(
                    event.source_id
                )}
            </h3>

            <p>
                <strong>Classification:</strong>
                ${escapeHTML(
                    event.classification
                )}
            </p>

            <p>
                <strong>Confidence:</strong>
                ${confidence}
            </p>

            <p>
                <strong>Land Cover:</strong>
                ${escapeHTML(
                    event.land_cover ||
                    "Unknown"
                )}
            </p>

            <p>
                <strong>Mean FRP:</strong>
                ${formatFRP(
                    event.mean_frp
                )}
            </p>

            <p>
                <strong>Persistence:</strong>
                ${escapeHTML(
                    persistence
                )}
            </p>

        </div>

    `;

}


/* =========================================================
   FILTER INITIALIZATION
========================================================= */

function initializeFilters() {

    const filterElements =
        document.querySelectorAll(
            "[data-filter]"
        );


    filterElements.forEach(
        element => {

            element.addEventListener(
                "click",
                () => {

                    applyFilter(
                        element.dataset.filter
                    );

                }
            );

        }
    );


    const search =
        document.getElementById(
            "event-search"
        );


    if (search) {

        search.addEventListener(
            "input",
            () => {

                applyFilters();

            }
        );

    }


    const classification =
        document.getElementById(
            "classification-filter"
        );


    if (classification) {

        classification.addEventListener(
            "change",
            () => {

                applyFilters();

            }
        );

    }


    const confidence =
        document.getElementById(
            "confidence-filter"
        );


    if (confidence) {

        confidence.addEventListener(
            "change",
            () => {

                applyFilters();

            }
        );

    }


    const reset =
        document.getElementById(
            "reset-filters"
        );


    if (reset) {

        reset.addEventListener(
            "click",
            resetFilters
        );

    }


    const previous =
        document.getElementById(
            "prev-page"
        );


    if (previous) {

        previous.addEventListener(
            "click",
            goToPreviousPage
        );

    }


    const next =
        document.getElementById(
            "next-page"
        );


    if (next) {

        next.addEventListener(
            "click",
            goToNextPage
        );

    }

}


/* =========================================================
   APPLY SINGLE FILTER
========================================================= */

function applyFilter(
    filter
) {

    const classification =
        document.getElementById(
            "classification-filter"
        );


    if (classification) {

        if (
            filter === "all"
        ) {

            classification.value =
                "all";

        } else {

            classification.value =
                filter;

        }

    }


    applyFilters();

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    const searchElement =
        document.getElementById(
            "event-search"
        );


    const classificationElement =
        document.getElementById(
            "classification-filter"
        );


    const confidenceElement =
        document.getElementById(
            "confidence-filter"
        );


    const search =
        searchElement
            ? searchElement.value
                .toLowerCase()
                .trim()
            : "";


    const classification =
        classificationElement
            ? classificationElement.value
            : "all";


    const confidenceFilter =
        confidenceElement
            ? confidenceElement.value
            : "all";


    filteredEvents =
        allEvents.filter(
            event => {

                const matchesSearch =
                    !search ||
                    String(
                        event.source_id
                    )
                        .toLowerCase()
                        .includes(search) ||
                    String(
                        event.classification
                    )
                        .toLowerCase()
                        .includes(search) ||
                    String(
                        event.land_cover
                    )
                        .toLowerCase()
                        .includes(search);


                const matchesClassification =
                    classification === "all" ||
                    event.classification ===
                        classification;


                let matchesConfidence =
                    true;


                if (
                    confidenceFilter !==
                    "all"
                ) {

                    const confidence =
                        event.confidence;


                    if (
                        confidence === null
                    ) {

                        matchesConfidence =
                            false;

                    } else if (
                        confidenceFilter ===
                        "high"
                    ) {

                        matchesConfidence =
                            confidence >= 80;

                    } else if (
                        confidenceFilter ===
                        "medium"
                    ) {

                        matchesConfidence =
                            confidence >= 60 &&
                            confidence < 80;

                    } else if (
                        confidenceFilter ===
                        "low"
                    ) {

                        matchesConfidence =
                            confidence < 60;

                    }

                }


                return (
                    matchesSearch &&
                    matchesClassification &&
                    matchesConfidence
                );

            }
        );


    currentPage = 1;


    updateTable();
    updateMap();
    updateAlerts();

}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {

    const search =
        document.getElementById(
            "event-search"
        );


    const classification =
        document.getElementById(
            "classification-filter"
        );


    const confidence =
        document.getElementById(
            "confidence-filter"
        );


    if (search) {
        search.value = "";
    }


    if (classification) {
        classification.value = "all";
    }


    if (confidence) {
        confidence.value = "all";
    }


    filteredEvents =
        [...allEvents];


    currentPage = 1;


    updateTable();
    updateMap();
    updateAlerts();

}


/* =========================================================
   ALERT CENTER
========================================================= */

function updateAlerts() {

    alerts = [];


    filteredEvents.forEach(
        event => {

            if (
                event.classification !==
                "Industrial"
            ) {

                return;

            }


            const confidence =
                event.confidence;


            if (
                confidence === null ||
                confidence === undefined
            ) {

                return;

            }


            let level =
                "MONITOR";


            if (
                confidence >=
                ALERT_THRESHOLDS.CRITICAL
            ) {

                level =
                    "CRITICAL";

            } else if (
                confidence >=
                ALERT_THRESHOLDS.HIGH
            ) {

                level =
                    "HIGH";

            }


            alerts.push({

                ...event,

                alertLevel:
                    level

            });

        }
    );


    /*
     * Highest priority first.
     */

    const priority = {

        CRITICAL: 1,

        HIGH: 2,

        MONITOR: 3

    };


    alerts.sort(
        (a, b) =>
            priority[
                a.alertLevel
            ] -
            priority[
                b.alertLevel
            ]
    );


    updateAlertSummary();
    renderAlerts();

}


/* =========================================================
   ALERT SUMMARY
========================================================= */

function updateAlertSummary() {

    const critical =
        alerts.filter(
            alert =>
                alert.alertLevel ===
                "CRITICAL"
        ).length;


    const high =
        alerts.filter(
            alert =>
                alert.alertLevel ===
                "HIGH"
        ).length;


    const monitor =
        alerts.filter(
            alert =>
                alert.alertLevel ===
                "MONITOR"
        ).length;


    setElementText(
        "critical-alert-count",
        critical
    );


    setElementText(
        "high-alert-count",
        high
    );


    setElementText(
        "monitor-alert-count",
        monitor
    );

}


/* =========================================================
   RENDER ALERTS
========================================================= */

function renderAlerts() {

    const alertList =
        document.getElementById(
            "alert-list"
        );


    if (!alertList) {
        return;
    }


    alertList.innerHTML = "";


    if (alerts.length === 0) {

        alertList.innerHTML = `

            <div class="no-alerts">
                No industrial alerts detected.
            </div>

        `;

        return;

    }


    alerts.forEach(
        alert => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                `alert-item ${alert.alertLevel.toLowerCase()}`;


            const persistence =
                formatPersistence(
                    alert.persistence_score,
                    alert.persistence_category
                );


            item.innerHTML = `

                <div class="alert-item-icon">
                    ${getAlertIcon(
                        alert.alertLevel
                    )}
                </div>

                <div class="alert-item-main">

                    <div class="alert-title">
                        ${escapeHTML(
                            alert.alertLevel
                        )}
                    </div>

                    <div class="alert-source">
                        ${escapeHTML(
                            alert.source_id
                        )}
                    </div>

                    <div class="alert-details">

                        Confidence:
                        <strong>
                            ${formatConfidence(
                                alert.confidence
                            )}
                        </strong>

                        &nbsp;|&nbsp;

                        Persistence:
                        <strong>
                            ${escapeHTML(
                                persistence
                            )}
                        </strong>

                    </div>

                </div>

            `;


            item.addEventListener(
                "click",
                () => {

                    selectEvent(
                        alert
                    );

                }
            );


            alertList.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   ALERT ICON
========================================================= */

function getAlertIcon(
    level
) {

    switch (level) {

        case "CRITICAL":
            return "⚠";

        case "HIGH":
            return "▲";

        default:
            return "●";

    }

}


/* =========================================================
   PREDICTION FORM
========================================================= */

function initializePredictionForm() {

    const form =
        document.getElementById(
            "prediction-form"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await submitPrediction(
                form
            );

        }
    );

}


/* =========================================================
   SUBMIT PREDICTION
========================================================= */

async function submitPrediction(
    form
) {

    const button =
        form.querySelector(
            "button[type='submit']"
        );


    const result =
        document.getElementById(
            "prediction-result"
        );


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "PREDICTING...";

        }


        const formData =
            new FormData(form);


        const payload = {};


        formData.forEach(
            (value, key) => {

                payload[key] =
                    value;

            }
        );


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
                            payload
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                `Backend returned ${response.status}`
            );

        }


        const data =
            await response.json();


        const prediction =
            normalizePredictionResponse(
                data
            );


        displayPredictionResult(
            prediction
        );


    } catch (error) {

        console.error(
            "Prediction error:",
            error
        );


        displayPredictionError(
            "Prediction service unavailable. Please make sure the local backend is running."
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "PREDICT EVENT";

        }

    }

}


/* =========================================================
   NORMALIZE PREDICTION RESPONSE
========================================================= */

function normalizePredictionResponse(
    data
) {

    const classification =
        getValue(
            data,
            [
                "classification",
                "prediction",
                "predicted_class",
                "class",
                "label"
            ]
        ) || "Other";


    const confidence =
        parseConfidence(
            getValue(
                data,
                [
                    "confidence_pct",
                    "confidence_percent",
                    "confidence",
                    "model_confidence"
                ]
            )
        );


    const persistenceScore =
        parsePersistenceScore(
            getValue(
                data,
                [
                    "persistence_score"
                ]
            )
        );


    const persistentFlag =
        getValue(
            data,
            [
                "persistent_flag"
            ]
        );


    const persistenceCategory =
        getValue(
            data,
            [
                "persistence_category"
            ]
        );


    return {

        classification:
            normalizeClassification(
                classification
            ),

        confidence,

        persistence_score:
            persistenceScore,

        persistent_flag:
            persistentFlag,

        persistence_category:
            persistenceCategory

    };

}


/* =========================================================
   DISPLAY PREDICTION RESULT
========================================================= */

function displayPredictionResult(
    prediction
) {

    const result =
        document.getElementById(
            "prediction-result"
        );


    if (result) {

        result.classList.add(
            "show"
        );

    }


    const classification =
        document.getElementById(
            "result-classification"
        );


    if (classification) {

        classification.textContent =
            prediction.classification;

    }


    const confidence =
        document.getElementById(
            "result-confidence-value"
        );


    if (confidence) {

        confidence.textContent =
            formatConfidence(
                prediction.confidence
            );

    }


    const persistence =
        document.getElementById(
            "result-persistence-value"
        );


    if (persistence) {

        persistence.textContent =
            formatPersistence(
                prediction.persistence_score,
                prediction.persistence_category
            );

    }


    const badge =
        document.getElementById(
            "prediction-alert-badge"
        );


    if (badge) {

        badge.className =
            "prediction-alert-badge";


        if (
            prediction.classification ===
            "Industrial" &&
            prediction.confidence !== null
        ) {

            if (
                prediction.confidence >=
                ALERT_THRESHOLDS.CRITICAL
            ) {

                badge.textContent =
                    "CRITICAL";

                badge.classList.add(
                    "critical"
                );

            } else if (
                prediction.confidence >=
                ALERT_THRESHOLDS.HIGH
            ) {

                badge.textContent =
                    "HIGH";

                badge.classList.add(
                    "high"
                );

            } else {

                badge.textContent =
                    "MONITOR";

                badge.classList.add(
                    "monitor"
                );

            }

        } else {

            badge.textContent =
                "NO INDUSTRIAL ALERT";

            badge.classList.add(
                "normal"
            );

        }

    }

}


/* =========================================================
   PREDICTION ERROR
========================================================= */

function displayPredictionError(
    message
) {

    const result =
        document.getElementById(
            "prediction-result"
        );


    if (result) {

        result.classList.add(
            "show"
        );

    }


    const classification =
        document.getElementById(
            "result-classification"
        );


    if (classification) {

        classification.textContent =
            message;

    }


    const confidence =
        document.getElementById(
            "result-confidence-value"
        );


    if (confidence) {

        confidence.textContent =
            "—";

    }


    const persistence =
        document.getElementById(
            "result-persistence-value"
        );


    if (persistence) {

        persistence.textContent =
            "—";

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

    const links =
        document.querySelectorAll(
            "[data-section]"
        );


    links.forEach(
        link => {

            link.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const section =
                        link.dataset.section;


                    showSection(
                        section
                    );

                }
            );

        }
    );

}


/* =========================================================
   SHOW SECTION
========================================================= */

function showSection(
    sectionId
) {

    const sections =
        document.querySelectorAll(
            ".dashboard-section"
        );


    sections.forEach(
        section => {

            section.classList.remove(
                "active"
            );

        }
    );


    const target =
        document.getElementById(
            sectionId
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }


    const navLinks =
        document.querySelectorAll(
            "[data-section]"
        );


    navLinks.forEach(
        link => {

            link.classList.toggle(
                "active",
                link.dataset.section ===
                    sectionId
            );

        }
    );

}


/* =========================================================
   DATA ERROR
========================================================= */

function showDataError(
    message
) {

    console.error(message);


    const table =
        document.getElementById(
            "event-table-body"
        );


    if (table) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty-state error"
                >
                    ${escapeHTML(
                        message
                    )}
                </td>

            </tr>

        `;

    }

}


/* =========================================================
   HTML ESCAPING
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
   ATTRIBUTE ESCAPING
========================================================= */

function escapeHTMLAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =========================================================
   STORAGE HELPERS
========================================================= */

function saveEventsToStorage() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                allEvents
            )
        );

    } catch (error) {

        console.warn(
            "Could not save events to local storage.",
            error
        );

    }

}


function loadEventsFromStorage() {

    try {

        const stored =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!stored) {
            return null;
        }


        const parsed =
            JSON.parse(
                stored
            );


        if (
            Array.isArray(parsed)
        ) {

            return parsed;

        }

    } catch (error) {

        console.warn(
            "Could not read stored events.",
            error
        );

    }


    return null;

}


/* =========================================================
   WINDOW HELPERS
========================================================= */

window.applyFilters =
    applyFilters;

window.resetFilters =
    resetFilters;

window.goToPreviousPage =
    goToPreviousPage;

window.goToNextPage =
    goToNextPage;

window.showSection =
    showSection;

window.selectEvent =
    selectEvent;

    

/* =========================================================
   END OF APP.JS
========================================================= */
