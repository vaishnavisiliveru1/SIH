let allEvents = [];
let filteredEvents = [];

let map = null;
let markersLayer = null;

let alerts = [];
let selectedEvent = null;

let persistenceMap = new Map();

let currentPage = 1;
const rowsPerPage = 10;

const BACKEND_URL = "http://127.0.0.1:8000/predict";

const ALERT_THRESHOLDS = {
    CRITICAL: 80,
    HIGH: 60
};


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
});


async function initializeDashboard() {

    initializeNavigation();
    initializeMap();
    initializeFilters();
    initializePredictionForm();
    initializePagination();

    await loadDashboardData();
}


/* =========================================================
   CSV LOADING
========================================================= */

async function loadCSVWithFallback(paths) {

    for (const path of paths) {

        try {

            const response = await fetch(
                path + "?v=" + Date.now()
            );

            if (!response.ok) {
                continue;
            }

            const text = await response.text();

            if (
                text &&
                text.trim().length > 0
            ) {
                console.log(
                    "Loaded CSV:",
                    path
                );

                return text;
            }

        } catch (error) {

            console.warn(
                "Failed to load:",
                path
            );

        }
    }

    throw new Error(
        "CSV file could not be loaded."
    );
}


/* =========================================================
   LOAD DASHBOARD DATA
========================================================= */

async function loadDashboardData() {

    try {

        /*
         * IMPORTANT:
         * The files are inside frontend/
         * so use the simple filenames first.
         */

        const classificationCSV =
            await loadCSVWithFallback([
                "event_classification_features.csv",
                "./event_classification_features.csv",
                "frontend/event_classification_features.csv",
                "./frontend/event_classification_features.csv"
            ]);


        let persistenceCSV = "";

        try {

            persistenceCSV =
                await loadCSVWithFallback([
                    "source_persistence_features.csv",
                    "./source_persistence_features.csv",
                    "frontend/source_persistence_features.csv",
                    "./frontend/source_persistence_features.csv"
                ]);

        } catch (error) {

            console.warn(
                "Persistence CSV not found. Continuing without persistence."
            );

        }


        const classificationData =
            parseCSV(classificationCSV);


        const persistenceData =
            persistenceCSV
                ? parseCSV(persistenceCSV)
                : [];


        console.log(
            "Classification rows:",
            classificationData.length
        );


        console.log(
            "Persistence rows:",
            persistenceData.length
        );


        processData(
            classificationData,
            persistenceData
        );


    } catch (error) {

        console.error(
            "DATA LOAD ERROR:",
            error
        );


        showDataError(
            "Unable to load event classification data."
        );

    }
}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {

    const rows = [];

    let currentRow = [];
    let currentValue = "";
    let insideQuotes = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char = text[i];

        const nextChar =
            text[i + 1];


        if (
            char === '"' &&
            insideQuotes &&
            nextChar === '"'
        ) {

            currentValue += '"';
            i++;

        }

        else if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

        }

        else if (
            char === "," &&
            !insideQuotes
        ) {

            currentRow.push(
                currentValue
            );

            currentValue = "";

        }

        else if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                nextChar === "\n"
            ) {
                i++;
            }


            currentRow.push(
                currentValue
            );

            currentValue = "";


            if (
                currentRow.some(
                    value =>
                        String(value)
                            .trim() !== ""
                )
            ) {

                rows.push(
                    currentRow
                );

            }


            currentRow = [];

        }

        else {

            currentValue += char;

        }
    }


    if (
        currentValue !== "" ||
        currentRow.length > 0
    ) {

        currentRow.push(
            currentValue
        );


        if (
            currentRow.some(
                value =>
                    String(value)
                        .trim() !== ""
            )
        ) {

            rows.push(
                currentRow
            );

        }
    }


    if (
        rows.length === 0
    ) {

        return [];

    }


    const headers =
        rows[0].map(
            header =>
                String(header)
                    .trim()
                    .replace(
                        /^\uFEFF/,
                        ""
                    )
                    .replace(
                        /^"|"$/g,
                        ""
                    )
        );


    return rows
        .slice(1)
        .map(row => {

            const object = {};


            headers.forEach(
                (
                    header,
                    index
                ) => {

                    object[header] =
                        row[index] !==
                        undefined
                            ? String(
                                row[index]
                            ).trim()
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
    classificationData,
    persistenceData = []
) {

    persistenceMap =
        new Map();


    /*
     * Build persistence lookup.
     */

    persistenceData.forEach(
        row => {

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

        }
    );


    /*
     * Convert classification rows
     * into dashboard events.
     */

    allEvents =
        classificationData.map(
            (row, index) =>
                normalizeEvent(
                    row,
                    index
                )
        );


    /*
     * Attach persistence.
     */

    applyPersistenceData(
        allEvents
    );


    filteredEvents =
        [...allEvents];


    currentPage = 1;


    console.log(
        "TOTAL EVENTS:",
        allEvents.length
    );


    console.log(
        "FIRST EVENT:",
        allEvents[0]
    );


    updateDashboard();

}


/* =========================================================
   NORMALIZE EVENT
========================================================= */

function normalizeEvent(
    row,
    index
) {

    /*
     * Your classification CSV uses
     * predicted_event_type.
     */

    const sourceId =
        getValue(
            row,
            [
                "source_id",
                "SOURCE_ID",
                "Source ID",
                "source id"
            ]
        );


    const predictedType =
        getValue(
            row,
            [
                "predicted_event_type",
                "Predicted Event Type",
                "prediction",
                "predicted_class",
                "classification",
                "AI Classification",
                "class",
                "label"
            ]
        );


    const confidenceRaw =
        getValue(
            row,
            [
                "confidence_pct",
                "confidence",
                "Confidence",
                "confidence_percent",
                "model_confidence",
                "prediction_confidence"
            ]
        );


    const latitudeRaw =
        getValue(
            row,
            [
                "latitude",
                "Latitude",
                "lat",
                "LATITUDE"
            ]
        );


    const longitudeRaw =
        getValue(
            row,
            [
                "longitude",
                "Longitude",
                "lon",
                "lng",
                "LONGITUDE"
            ]
        );


    const landcover =
        getValue(
            row,
            [
                "landcover",
                "land_cover",
                "Land Cover",
                "land_cover_type",
                "landcover_type"
            ]
        );


    const meanFRPRaw =
        getValue(
            row,
            [
                "mean_frp",
                "Mean FRP",
                "mean_frp_mw",
                "Mean FRP (MW)",
                "frp"
            ]
        );


    const maxFRPRaw =
        getValue(
            row,
            [
                "max_frp",
                "Maximum FRP",
                "max_frp_mw",
                "Maximum FRP (MW)"
            ]
        );


    const event = {

        ...row,

        index,

        source_id:
            sourceId !== null
                ? String(
                    sourceId
                ).trim()
                : `EVENT-${index + 1}`,

        predicted_event_type:
            normalizeType(
                predictedType
            ),

        confidence:
            parseConfidence(
                confidenceRaw
            ),

        latitude:
            parseFloat(
                latitudeRaw
            ),

        longitude:
            parseFloat(
                longitudeRaw
            ),

        landcover:
            landcover ||
            "Unknown",

        mean_frp:
            Number.isFinite(
                parseFloat(
                    meanFRPRaw
                )
            )
                ? parseFloat(
                    meanFRPRaw
                )
                : null,

        max_frp:
            Number.isFinite(
                parseFloat(
                    maxFRPRaw
                )
            )
                ? parseFloat(
                    maxFRPRaw
                )
                : null,

        persistence_score:
            null,

        persistent_flag:
            null,

        persistence_category:
            null

    };


    return event;

}


/* =========================================================
   NORMALIZE EVENT TYPE
========================================================= */

function normalizeType(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "Other";

    }


    const text =
        String(value)
            .trim()
            .toLowerCase();


    if (
        text.includes(
            "industrial"
        )
    ) {

        return "Industrial";

    }


    if (
        text.includes(
            "forest"
        ) ||
        text.includes(
            "natural"
        ) ||
        text.includes(
            "wildfire"
        )
    ) {

        return "Forest/Natural";

    }


    if (
        text.includes(
            "agricultural"
        ) ||
        text.includes(
            "agriculture"
        ) ||
        text.includes(
            "crop"
        )
    ) {

        return "Agricultural";

    }


    if (
        text === "other"
    ) {

        return "Other";

    }


    return "Other";

}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(
    object,
    possibleKeys
) {

    if (
        !object ||
        typeof object !== "object"
    ) {

        return null;

    }


    /*
     * Exact key lookup.
     */

    for (
        const key of possibleKeys
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                object,
                key
            )
        ) {

            const value =
                object[key];


            if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            ) {

                return value;

            }

        }

    }


    /*
     * Case-insensitive lookup.
     */

    const actualKeys =
        Object.keys(
            object
        );


    for (
        const wantedKey of possibleKeys
    ) {

        const matchingKey =
            actualKeys.find(
                actualKey =>
                    actualKey
                        .trim()
                        .toLowerCase() ===
                    String(
                        wantedKey
                    )
                        .trim()
                        .toLowerCase()
            );


        if (
            matchingKey
        ) {

            const value =
                object[
                    matchingKey
                ];


            if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            ) {

                return value;

            }

        }

    }


    return null;

}


/* =========================================================
   CONFIDENCE PARSER
========================================================= */

function parseConfidence(
    value
) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return null;

    }


    let number =
        parseFloat(
            String(value)
                .replace(
                    "%",
                    ""
                )
                .trim()
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return null;

    }


    /*
     * Convert 0.87 → 87.
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
   PERSISTENCE
========================================================= */

function applyPersistenceData(
    events
) {

    events.forEach(
        event => {

            const sourceId =
                String(
                    event.source_id
                ).trim();


            const persistenceRow =
                persistenceMap.get(
                    sourceId
                );


            if (
                !persistenceRow
            ) {

                return;

            }


            const score =
                parsePersistenceScore(
                    getValue(
                        persistenceRow,
                        [
                            "persistence_score",
                            "Persistence Score",
                            "persistence"
                        ]
                    )
                );


            const flag =
                getValue(
                    persistenceRow,
                    [
                        "persistent_flag",
                        "Persistent Flag"
                    ]
                );


            const category =
                getValue(
                    persistenceRow,
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

        }
    );

}


/* =========================================================
   PERSISTENCE SCORE
========================================================= */

function parsePersistenceScore(
    value
) {

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
                .replace(
                    "%",
                    ""
                )
                .trim()
        );


    if (
        !Number.isFinite(
            score
        )
    ) {

        return null;

    }


    return score;

}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {

    updateCounts();

    renderMarkers();

    renderTable();

    updateAlerts();

    updateFilterOptions();

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


    allEvents.forEach(
        event => {

            const type =
                normalizeType(
                    event.predicted_event_type
                );


            if (
                Object.prototype.hasOwnProperty.call(
                    counts,
                    type
                )
            ) {

                counts[type]++;

            }

        }
    );


    setText(
        "total-sources",
        allEvents.length
    );


    setText(
        "industrial-count",
        counts.Industrial
    );


    setText(
        "forest-count",
        counts[
            "Forest/Natural"
        ]
    );


    setText(
        "agricultural-count",
        counts.Agricultural
    );


    setText(
        "other-count",
        counts.Other
    );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.textContent =
            value;

    }

}


/* =========================================================
   FILTER OPTIONS
========================================================= */

function updateFilterOptions() {

    const landcoverFilter =
        document.getElementById(
            "landcover-filter"
        );


    if (
        !landcoverFilter
    ) {

        return;

    }


    const currentValue =
        landcoverFilter.value;


    const landcovers =
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
        ]
        .sort();


    landcoverFilter.innerHTML = `

        <option value="ALL">
            All Land Covers
        </option>

    `;


    landcovers.forEach(
        landcover => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                landcover;


            option.textContent =
                landcover;


            landcoverFilter.appendChild(
                option
            );

        }
    );


    if (
        landcovers.includes(
            currentValue
        )
    ) {

        landcoverFilter.value =
            currentValue;

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


    if (
        !tbody
    ) {

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


        updatePagination();

        return;

    }


    const totalPages =
        Math.ceil(
            filteredEvents.length /
            rowsPerPage
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const start =
        (
            currentPage - 1
        ) *
        rowsPerPage;


    const pageEvents =
        filteredEvents.slice(
            start,
            start + rowsPerPage
        );


    pageEvents.forEach(
        event => {

            const row =
                document.createElement(
                    "tr"
                );


            const type =
                normalizeType(
                    event.predicted_event_type
                );


            const persistence =
                formatPersistence(
                    event.persistence_score,
                    event.persistence_category
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
                        class="event-badge ${getBadgeClass(type)}"
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
                        event.landcover ||
                        "Unknown"
                    )}

                </td>


                <td>

                    ${formatNumber(
                        event.mean_frp,
                        2
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        persistence
                    )}

                </td>


                <td>

                    <button
                        class="view-source-btn"
                        onclick="showEventById('${escapeAttribute(
                            event.source_id
                        )}')"
                    >

                        VIEW

                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );


    updatePagination();

}


/* =========================================================
   PAGINATION
========================================================= */

function initializePagination() {

    const previous =
        document.getElementById(
            "prev-page"
        );


    const next =
        document.getElementById(
            "next-page"
        );


    if (
        previous
    ) {

        previous.addEventListener(
            "click",
            () => {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    renderTable();

                }

            }
        );

    }


    if (
        next
    ) {

        next.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        filteredEvents.length /
                        rowsPerPage
                    );


                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    renderTable();

                }

            }
        );

    }

}


function updatePagination() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredEvents.length /
                rowsPerPage
            )
        );


    const pageNumber =
        document.getElementById(
            "page-number"
        );


    if (
        pageNumber
    ) {

        pageNumber.textContent =
            `${currentPage} / ${totalPages}`;

    }


    const previous =
        document.getElementById(
            "prev-page"
        );


    const next =
        document.getElementById(
            "next-page"
        );


    if (
        previous
    ) {

        previous.disabled =
            currentPage <= 1;

    }


    if (
        next
    ) {

        next.disabled =
            currentPage >= totalPages;

    }

}


/* =========================================================
   FORMAT HELPERS
========================================================= */

function formatConfidence(
    confidence
) {

    if (
        confidence === null ||
        confidence === undefined ||
        !Number.isFinite(
            confidence
        )
    ) {

        return "—";

    }


    return (
        Number(
            confidence
        ).toFixed(1) +
        "%"
    );

}


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


    return Number(
        value
    ).toFixed(
        decimals
    );

}


function formatPersistenceScore(
    score
) {

    if (
        score === null ||
        score === undefined ||
        !Number.isFinite(
            Number(score)
        )
    ) {

        return "—";

    }


    return Number(
        score
    ).toFixed(3);

}


function formatPersistence(
    score,
    category
) {

    const scoreText =
        formatPersistenceScore(
            score
        );


    if (
        scoreText === "—"
    ) {

        return (
            category &&
            String(
                category
            ).trim() !== ""
                ? String(
                    category
                )
                : "—"
        );

    }


    if (
        category &&
        String(
            category
        ).trim() !== ""
    ) {

        return (
            scoreText +
            " (" +
            String(
                category
            ) +
            ")"
        );

    }


    return scoreText;

}


/* =========================================================
   BADGES
========================================================= */

function getBadgeClass(
    type
) {

    switch (
        type
    ) {

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
   MAP INITIALIZATION
========================================================= */

function initializeMap() {

    const mapElement =
        document.getElementById(
            "map"
        );


    if (
        !mapElement
    ) {

        console.warn(
            "Map element not found."
        );

        return;

    }


    if (
        typeof L === "undefined"
    ) {

        console.error(
            "Leaflet is not loaded."
        );

        return;

    }


    map =
        L.map(
            "map"
        ).setView(
            [
                20.5937,
                78.9629
            ],
            5
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(
        map
    );


    markersLayer =
        L.layerGroup()
            .addTo(
                map
            );

}


/* =========================================================
   MAP MARKERS
========================================================= */

function renderMarkers() {

    if (
        !markersLayer
    ) {

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
                createPopup(
                    event
                )
            );


            marker.on(
                "click",
                () => {

                    selectedEvent =
                        event;

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
        bounds.length > 0
    ) {

        try {

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

        } catch (
            error
        ) {

            console.warn(
                "Could not fit map bounds.",
                error
            );

        }

    }

}


/* =========================================================
   MAP COLORS
========================================================= */

function getEventColor(
    type
) {

    switch (
        type
    ) {

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
   MAP POPUP
========================================================= */

function createPopup(
    event
) {

    const type =
        normalizeType(
            event.predicted_event_type
        );


    const persistence =
        formatPersistence(
            event.persistence_score,
            event.persistence_category
        );


    return `

        <div
            style="
                min-width:210px;
                font-family:Arial,sans-serif;
            "
        >

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


            <strong
                style="
                    font-size:14px;
                    color:#e2e8f0;
                "
            >

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

                ${escapeHTML(
                    type
                )}

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
                MW

            </div>


            <div>

                <b>Persistence:</b>

                ${escapeHTML(
                    persistence
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
                    padding:6px;
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
   SHOW EVENT
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
                String(
                    sourceId
                )
        );


    if (
        !event
    ) {

        console.warn(
            "Event not found:",
            sourceId
        );

        return;

    }


    selectedEvent =
        event;


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
            10
        );

    }

}


/* =========================================================
   EVENT DETAILS
========================================================= */

function showEventDetails(
    event
) {

    const possibleContainers = [
        "event-details",
        "selected-event-details",
        "source-details"
    ];


    let container = null;


    for (
        const id of possibleContainers
    ) {

        const element =
            document.getElementById(
                id
            );


        if (
            element
        ) {

            container =
                element;

            break;

        }

    }


    if (
        !container
    ) {

        return;

    }


    const type =
        normalizeType(
            event.predicted_event_type
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
                    type
                )}
            </strong>

        </div>


        <div class="detail-row">

            <span>CONFIDENCE</span>

            <strong>
                ${formatConfidence(
                    event.confidence
                )}
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
                    event.landcover
                )}
            </strong>

        </div>


        <div class="detail-row">

            <span>MEAN FRP</span>

            <strong>
                ${formatNumber(
                    event.mean_frp
                )}
                MW
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
   END PART 1
========================================================= */
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


function calculatePredictionPersistence(input) {

    const total =
        Math.max(
            0,
            Number(
                input.total_detections
            ) || 0
        );


    const active =
        Math.max(
            0,
            Number(
                input.active_days
            ) || 0
        );


    const span =
        Math.max(
            0,
            Number(
                input.observation_span_days
            ) || 0
        );


    if (
        !total &&
        !active &&
        !span
    ) {

        return 0;

    }


    const recurrence =
        Math.min(
            1,
            active / 7
        );


    const spanComponent =
        Math.min(
            1,
            span / 5
        );


    const frequency =
        Math.min(
            1,
            total /
            Math.max(
                1,
                active * 10
            )
        );


    return

        0.40 * recurrence +

        0.30 * spanComponent +

        0.30 * frequency;

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

            persistence_score:

                result.persistence_score ??

                calculatePredictionPersistence(
                    input
                ),

            persistent_flag:

                result.persistent_flag ??

                (
                    calculatePredictionPersistence(
                        input
                    ) >= 0.60
                ),

            persistence_category:

                result.persistence_category ||

                persistenceCategory(
                    calculatePredictionPersistence(
                        input
                    )
                ),


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


    const persistenceElement =
        document.getElementById(
            "result-persistence-value"
        );


    const persistenceCategoryElement =
        document.getElementById(
            "result-persistence-category"
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


    if (persistenceElement) {

        persistenceElement.textContent =
            formatPersistence(
                event.persistence_score
            );

    }


    if (persistenceCategoryElement) {

        persistenceCategoryElement.textContent =

            event.persistence_category ||

            persistenceCategory(
                event.persistence_score
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
