/* =========================================================
   AI THERMAL EVENT INTELLIGENCE DASHBOARD
   FRONTEND CONTROLLER + AI EVENT ANALYSIS INTERFACE
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let allEvents = [];

let filteredEvents = [];

let markersLayer;

let map;


/* =========================================================
   INITIALIZE MAP
========================================================= */

function initializeMap() {

  map = L.map("map", {
    zoomControl: true
  }).setView([20.5937, 78.9629], 5);


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);


  markersLayer = L.layerGroup().addTo(map);

}


/* =========================================================
   LOAD CSV
========================================================= */

function loadPredictionData() {

  const possiblePaths = [

    "./static/predictions.csv",

    "static/predictions.csv",

    "./data/predictions.csv",

    "data/predictions.csv",

    "./predictions.csv"

  ];

  tryNextPath(possiblePaths, 0);

}


/* =========================================================
   TRY CSV PATHS
========================================================= */

function tryNextPath(paths, index) {

  if (index >= paths.length) {

    console.warn(
      "Prediction CSV could not be loaded."
    );

    updateDashboard();

    renderMarkers();

    renderTable();

    return;

  }


  Papa.parse(
    paths[index],
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

          tryNextPath(paths, index + 1);

          return;

        }


        if (
          !results.data ||
          results.data.length === 0
        ) {

          tryNextPath(paths, index + 1);

          return;

        }


        console.log(
          "Loaded:",
          paths[index]
        );


        processData(results.data);

      },


      error: function() {

        tryNextPath(paths, index + 1);

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


  filteredEvents = [...allEvents];


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


  Object.keys(row).forEach(key => {

    event[key] = row[key];

  });


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
    normalizeEventType(
      getValue(
        row,
        [
          "predicted_event_type",
          "event_type",
          "classification"
        ]
      ) || "Other"
    );


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


  event.industrial_land_ratio =
    parseNumber(
      getValue(
        row,
        [
          "industrial_land_ratio"
        ]
      )
    );


  event.forest_land_ratio =
    parseNumber(
      getValue(
        row,
        [
          "forest_land_ratio"
        ]
      )
    );


  event.agricultural_land_ratio =
    parseNumber(
      getValue(
        row,
        [
          "agricultural_land_ratio"
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


  event.landcover_code =
    parseNumber(
      getValue(
        row,
        [
          "landcover_code"
        ]
      )
    );


  /* M4 */

  event.first_detection =
    getValue(
      row,
      [
        "first_detection"
      ]
    );


  event.last_detection =
    getValue(
      row,
      [
        "last_detection"
      ]
    );


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


  event.detections_per_span_day =
    parseNumber(
      getValue(
        row,
        [
          "detections_per_span_day"
        ]
      )
    );


  event.mean_gap_hours =
    parseNumber(
      getValue(
        row,
        [
          "mean_gap_hours"
        ]
      )
    );


  event.std_gap_hours =
    parseNumber(
      getValue(
        row,
        [
          "std_gap_hours"
        ]
      )
    );


  event.median_gap_hours =
    parseNumber(
      getValue(
        row,
        [
          "median_gap_hours"
        ]
      )
    );


  event.min_gap_hours =
    parseNumber(
      getValue(
        row,
        [
          "min_gap_hours"
        ]
      )
    );


  event.max_gap_hours =
    parseNumber(
      getValue(
        row,
        [
          "max_gap_hours"
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


  event.max_active_days_7d =
    parseNumber(
      getValue(
        row,
        [
          "max_active_days_7d"
        ]
      )
    );


  event.max_active_days_14d =
    parseNumber(
      getValue(
        row,
        [
          "max_active_days_14d"
        ]
      )
    );


  event.max_active_days_30d =
    parseNumber(
      getValue(
        row,
        [
          "max_active_days_30d"
        ]
      )
    );


  event.observation_days =
    parseNumber(
      getValue(
        row,
        [
          "observation_days"
        ]
      )
    );


  return event;

}


/* =========================================================
   EVENT TYPE NORMALIZATION
========================================================= */

function normalizeEventType(type) {

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
   HELPERS
========================================================= */

function getValue(row, possibleNames) {

  for (
    const name of possibleNames
  ) {

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


/* =========================================================
   DASHBOARD COUNTERS
========================================================= */

function updateDashboard() {

  const total =
    filteredEvents.length;


  const industrial =
    filteredEvents.filter(
      e =>
        e.predicted_event_type ===
        "Industrial"
    ).length;


  const forest =
    filteredEvents.filter(
      e =>
        e.predicted_event_type ===
        "Forest/Natural"
    ).length;


  const agricultural =
    filteredEvents.filter(
      e =>
        e.predicted_event_type ===
        "Agricultural"
    ).length;


  const other =
    filteredEvents.filter(
      e =>
        e.predicted_event_type ===
        "Other"
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


function setText(id, value) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent = value;

  }

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


  select.innerHTML =
    `<option value="ALL">
      All Land Covers
    </option>`;


  const values =
    [
      ...new Set(
        allEvents
          .map(e => e.landcover)
          .filter(
            value =>
              value &&
              value !== "Unknown"
          )
      )
    ]
    .sort();


  values.forEach(value => {

    const option =
      document.createElement(
        "option"
      );


    option.value = value;

    option.textContent = value;


    select.appendChild(option);

  });

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
    allEvents.filter(event => {


      const matchesType =
        type === "ALL" ||
        event.predicted_event_type ===
        type;


      const matchesSearch =
        !search ||
        event.source_id
          .toLowerCase()
          .includes(search);


      const matchesLandcover =
        landcover === "ALL" ||
        event.landcover ===
        landcover;


      const matchesConfidence =
        !Number.isFinite(
          event.confidence
        ) ||
        event.confidence >=
        minimumConfidence;


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

    const color =
      getEventColor(
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
      function() {

        showEventDetails(event);

      }
    );


    marker.addTo(markersLayer);


    bounds.push(
      [
        event.latitude,
        event.longitude
      ]
    );

  });


  if (bounds.length > 0) {

    map.fitBounds(
      bounds,
      {
        padding: [30, 30],
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
    event.predicted_event_type;


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

      <strong
        style="
          font-size:14px;
        "
      >
        ${escapeHTML(event.source_id)}
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
        ${formatConfidence(event.confidence)}
      </div>

      <div>
        <b>Land Cover:</b>
        ${escapeHTML(event.landcover)}
      </div>

      <div>
        <b>Mean FRP:</b>
        ${formatNumber(event.mean_frp)}
      </div>

      <button
        onclick="showEventById('${escapeAttribute(event.source_id)}')"
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


  filteredEvents.forEach(event => {

    const row =
      document.createElement("tr");


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
            ${getBadgeClass(
              event.predicted_event_type
            )}
          "
        >

          ${escapeHTML(
            event.predicted_event_type
          )}

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
            ? `${formatNumber(event.active_days)} days`
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
      function(e) {

        if (
          e.target.tagName !==
          "BUTTON"
        ) {

          showEventDetails(event);

        }

      }
    );


    tbody.appendChild(row);

  });

}


/* =========================================================
   EVENT DETAILS
========================================================= */

function showEventById(sourceId) {

  const event =
    allEvents.find(
      e =>
        e.source_id ===
        sourceId
    );


  if (event) {

    showEventDetails(event);

  }

}


/* =========================================================
   SHOW DETAILS
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


  sourceLabel.textContent =
    event.source_id;


  const type =
    event.predicted_event_type;


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
          "Mean Distance to Industry",
          formatDistance(
            event.mean_distance_industry
          )
        )}

        ${detailItem(
          "Minimum Distance to Industry",
          formatDistance(
            event.min_distance_industry
          )
        )}

        ${detailItem(
          "Industrial Facilities ≤1 km",
          formatNumber(
            event.facilities_1km
          )
        )}

        ${detailItem(
          "Industrial Facilities ≤5 km",
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
          "Forest Land Ratio",
          formatNumber(
            event.forest_land_ratio
          )
        )}

        ${detailItem(
          "Agricultural Land Ratio",
          formatNumber(
            event.agricultural_land_ratio
          )
        )}

        ${detailItem(
          "Nearest Refinery",
          formatDistance(
            event.nearest_refinery
          )
        )}

        ${detailItem(
          "Nearest Power Plant",
          formatDistance(
            event.nearest_powerplant
          )
        )}

        ${detailItem(
          "Nearest Mine",
          formatDistance(
            event.nearest_mine
          )
        )}

        ${detailItem(
          "Nearest Industrial Area",
          formatDistance(
            event.nearest_industrial_area
          )
        )}

        ${detailItem(
          "Land Cover Code",
          formatNumber(
            event.landcover_code
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
          "Detections / Span Day",
          formatNumber(
            event.detections_per_span_day
          )
        )}

        ${detailItem(
          "Mean Gap",
          formatHours(
            event.mean_gap_hours
          )
        )}

        ${detailItem(
          "Std Gap",
          formatHours(
            event.std_gap_hours
          )
        )}

        ${detailItem(
          "Median Gap",
          formatHours(
            event.median_gap_hours
          )
        )}

        ${detailItem(
          "Minimum Gap",
          formatHours(
            event.min_gap_hours
          )
        )}

        ${detailItem(
          "Maximum Gap",
          formatHours(
            event.max_gap_hours
          )
        )}

        ${detailItem(
          "Temporal Regularity",
          formatNumber(
            event.temporal_regularity
          )
        )}

        ${detailItem(
          "Max Active Days — 7d",
          formatNumber(
            event.max_active_days_7d
          )
        )}

        ${detailItem(
          "Max Active Days — 14d",
          formatNumber(
            event.max_active_days_14d
          )
        )}

        ${detailItem(
          "Max Active Days — 30d",
          formatNumber(
            event.max_active_days_30d
          )
        )}

        ${detailItem(
          "Observation Days",
          formatNumber(
            event.observation_days
          )
        )}

      </div>

    </div>

  `;


  document
    .querySelector(".details-panel")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

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


function formatHours(value) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {

    return "—";

  }


  return `${value.toFixed(2)} h`;

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


  if (
    value >= 0 &&
    value <= 1
  ) {

    value *= 100;

  }


  return `${value.toFixed(1)}%`;

}


function safeConfidence(value) {

  if (
    value === null ||
    !Number.isFinite(value)
  ) {

    return 0;

  }


  let confidence = value;


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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");

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


  if (allEvents.length > 0) {

    map.fitBounds(
      allEvents.map(
        event => [
          event.latitude,
          event.longitude
        ]
      ),
      {
        padding: [30, 30],
        maxZoom: 10
      }
    );

  }

}


/* =========================================================
   AI PREDICTION
   FRONTEND DEMONSTRATION LOGIC

   IMPORTANT:
   This section currently calculates a classification
   score in the browser.

   Your real trained ML model must eventually be connected
   through a backend/API for actual model inference.
========================================================= */

function analyzeThermalEvent() {

  const input =
    collectPredictionInputs();


  const score =
    calculateClassificationScore(
      input
    );


  const prediction =
    determinePrediction(
      input,
      score
    );


  displayPrediction(
    prediction.type,
    prediction.confidence,
    score
  );


  addPredictionToDashboard(
    input,
    prediction
  );

}


/* =========================================================
   COLLECT USER INPUT
========================================================= */

function collectPredictionInputs() {

  return {

    source_id:
      getInputValue("source-id"),

    latitude:
      getInputNumber("input-latitude"),

    longitude:
      getInputNumber("input-longitude"),


    mean_frp:
      getInputNumber("mean-frp"),

    max_frp:
      getInputNumber("max-frp"),

    mean_brightness:
      getInputNumber("mean-brightness"),

    max_brightness:
      getInputNumber("max-brightness"),


    mean_distance_industry:
      getInputNumber("mean-distance"),

    min_distance_industry:
      getInputNumber("min-distance"),

    facilities_1km:
      getInputNumber("facilities-1km"),

    facilities_5km:
      getInputNumber("facilities-5km"),

    industrial_land_ratio:
      getInputNumber("industrial-ratio"),

    forest_land_ratio:
      getInputNumber("forest-ratio"),

    agricultural_land_ratio:
      getInputNumber("agricultural-ratio"),

    nearest_facility_type:
      getInputValue("facility-type"),

    nearest_refinery:
      getInputNumber("refinery-distance"),

    nearest_powerplant:
      getInputNumber("powerplant-distance"),

    nearest_mine:
      getInputNumber("mine-distance"),

    nearest_industrial_area:
      getInputNumber("industrial-area-distance"),

    landcover_code:
      getInputNumber("landcover-code"),

    landcover:
      getInputValue("landcover-class"),


    first_detection:
      getInputValue("first-detection"),

    last_detection:
      getInputValue("last-detection"),

    total_detections:
      getInputNumber("total-detections"),

    active_days:
      getInputNumber("active-days"),

    observation_span_days:
      getInputNumber("observation-span"),

    recurrence_rate:
      getInputNumber("recurrence-rate"),

    detections_per_span_day:
      getInputNumber("detections-span"),

    mean_gap_hours:
      getInputNumber("mean-gap"),

    std_gap_hours:
      getInputNumber("std-gap"),

    median_gap_hours:
      getInputNumber("median-gap"),

    min_gap_hours:
      getInputNumber("min-gap"),

    max_gap_hours:
      getInputNumber("max-gap"),

    temporal_regularity:
      getInputNumber("temporal-regularity"),

    max_active_days_7d:
      getInputNumber("max-active-7"),

    max_active_days_14d:
      getInputNumber("max-active-14"),

    max_active_days_30d:
      getInputNumber("max-active-30"),

    observation_days:
      getInputNumber("observation-days")

  };

}


/* =========================================================
   INPUT HELPERS
========================================================= */

function getInputValue(id) {

  const element =
    document.getElementById(id);


  if (!element) return "";


  return element.value.trim();

}


function getInputNumber(id) {

  const value =
    getInputValue(id);


  if (value === "") {

    return 0;

  }


  const number =
    Number(value);


  return Number.isFinite(number)
    ? number
    : 0;

}


/* =========================================================
   CLASSIFICATION SCORE
========================================================= */

function calculateClassificationScore(input) {

  let industrialScore = 0;

  let forestScore = 0;

  let agriculturalScore = 0;


  /*
    INDUSTRIAL SIGNALS
  */

  if (
    input.mean_distance_industry <= 5
  ) {

    industrialScore += 20;

  }


  if (
    input.min_distance_industry <= 2
  ) {

    industrialScore += 15;

  }


  if (
    input.facilities_1km >= 1
  ) {

    industrialScore += 10;

  }


  if (
    input.facilities_5km >= 3
  ) {

    industrialScore += 8;

  }


  if (
    input.industrial_land_ratio >= 0.3
  ) {

    industrialScore += 18;

  }


  if (
    input.nearest_facility_type !==
    "None"
  ) {

    industrialScore += 10;

  }


  if (
    input.mean_frp >= 100
  ) {

    industrialScore += 7;

  }


  if (
    input.max_frp >= 200
  ) {

    industrialScore += 5;

  }


  /*
    PERSISTENCE / INDUSTRIAL SIGNAL
  */

  if (
    input.recurrence_rate >= 0.5
  ) {

    industrialScore += 5;

  }


  if (
    input.temporal_regularity >= 0.5
  ) {

    industrialScore += 2;

  }


  /*
    FOREST SIGNALS
  */

  if (
    input.forest_land_ratio >= 0.4
  ) {

    forestScore += 40;

  }


  if (
    input.landcover ===
    "Forest"
  ) {

    forestScore += 35;

  }


  if (
    input.industrial_land_ratio < 0.1
  ) {

    forestScore += 10;

  }


  /*
    AGRICULTURAL SIGNALS
  */

  if (
    input.agricultural_land_ratio >= 0.4
  ) {

    agriculturalScore += 40;

  }


  if (
    input.landcover ===
    "Cropland"
  ) {

    agriculturalScore += 35;

  }


  if (
    input.industrial_land_ratio < 0.1
  ) {

    agriculturalScore += 10;

  }


  return {

    industrial:
      Math.min(
        industrialScore,
        100
      ),

    forest:
      Math.min(
        forestScore,
        100
      ),

    agricultural:
      Math.min(
        agriculturalScore,
        100
      )

  };

}


/* =========================================================
   DETERMINE PREDICTION
========================================================= */

function determinePrediction(
  input,
  score
) {

  const scores = {

    Industrial:
      score.industrial,

    "Forest/Natural":
      score.forest,

    Agricultural:
      score.agricultural

  };


  let bestType =
    "Other";


  let bestScore =
    0;


  Object.keys(scores)
    .forEach(type => {

      if (
        scores[type] >
        bestScore
      ) {

        bestScore =
          scores[type];

        bestType =
          type;

      }

    });


  if (
    bestScore < 25
  ) {

    bestType =
      "Other";

  }


  let confidence =
    Math.max(
      55,
      Math.min(
        98,
        bestScore + 45
      )
    );


  /*
    Give stronger industrial classification
    when multiple industrial indicators agree.
  */

  if (
    bestType === "Industrial" &&
    input.industrial_land_ratio >= 0.5 &&
    input.facilities_1km >= 1 &&
    input.mean_distance_industry <= 5
  ) {

    confidence =
      Math.min(
        98,
        confidence + 5
      );

  }


  return {

    type: bestType,

    confidence: confidence

  };

}


/* =========================================================
   DISPLAY PREDICTION
========================================================= */

function displayPrediction(
  type,
  confidence,
  score
) {

  const result =
    document.getElementById(
      "prediction-result"
    );


  const typeElement =
    document.getElementById(
      "prediction-type"
    );


  const confidenceElement =
    document.getElementById(
      "prediction-confidence"
    );


  const bar =
    document.getElementById(
      "prediction-bar"
    );


  const color =
    getEventColor(type);


  result.classList.remove(
    "hidden"
  );


  typeElement.textContent =
    type;


  typeElement.style.color =
    color;


  confidenceElement.textContent =
    `Confidence: ${confidence.toFixed(1)}%`;


  bar.style.width =
    `${confidence}%`;


  bar.style.background =
    color;


  bar.style.boxShadow =
    `0 0 12px ${color}`;

}


/* =========================================================
   ADD USER PREDICTION TO DASHBOARD
========================================================= */

function addPredictionToDashboard(
  input,
  prediction
) {

  const existingIndex =
    allEvents.findIndex(
      event =>
        event.source_id ===
        input.source_id
    );


  const newEvent = {

    source_id:
      input.source_id,

    predicted_event_type:
      prediction.type,

    confidence:
      prediction.confidence,

    latitude:
      input.latitude,

    longitude:
      input.longitude,

    landcover:
      input.landcover,

    mean_frp:
      input.mean_frp,

    max_frp:
      input.max_frp,

    mean_brightness:
      input.mean_brightness,

    max_brightness:
      input.max_brightness,

    mean_distance_industry:
      input.mean_distance_industry,

    min_distance_industry:
      input.min_distance_industry,

    facilities_1km:
      input.facilities_1km,

    facilities_5km:
      input.facilities_5km,

    industrial_land_ratio:
      input.industrial_land_ratio,

    forest_land_ratio:
      input.forest_land_ratio,

    agricultural_land_ratio:
      input.agricultural_land_ratio,

    nearest_facility_type:
      input.nearest_facility_type,

    nearest_refinery:
      input.nearest_refinery,

    nearest_powerplant:
      input.nearest_powerplant,

    nearest_mine:
      input.nearest_mine,

    nearest_industrial_area:
      input.nearest_industrial_area,

    landcover_code:
      input.landcover_code,

    first_detection:
      input.first_detection,

    last_detection:
      input.last_detection,

    total_detections:
      input.total_detections,

    active_days:
      input.active_days,

    observation_span_days:
      input.observation_span_days,

    recurrence_rate:
      input.recurrence_rate,

    detections_per_span_day:
      input.detections_per_span_day,

    mean_gap_hours:
      input.mean_gap_hours,

    std_gap_hours:
      input.std_gap_hours,

    median_gap_hours:
      input.median_gap_hours,

    min_gap_hours:
      input.min_gap_hours,

    max_gap_hours:
      input.max_gap_hours,

    temporal_regularity:
      input.temporal_regularity,

    max_active_days_7d:
      input.max_active_days_7d,

    max_active_days_14d:
      input.max_active_days_14d,

    max_active_days_30d:
      input.max_active_days_30d,

    observation_days:
      input.observation_days

  };


  if (
    existingIndex >= 0
  ) {

    allEvents[
      existingIndex
    ] =
      newEvent;

  } else {

    allEvents.push(
      newEvent
    );

  }


  filteredEvents =
    [...allEvents];


  populateLandCoverFilter();

  updateDashboard();

  renderMarkers();

  renderTable();

  showEventDetails(
    newEvent
  );

}


/* =========================================================
   CLEAR INPUTS
========================================================= */

function clearPredictionInputs() {

  const form =
    document.getElementById(
      "prediction-form"
    );


  form.reset();


  document
    .getElementById(
      "prediction-result"
    )
    .classList.add(
      "hidden"
    );

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    initializeMap();

    loadPredictionData();


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
        "prediction-form"
      )
      .addEventListener(
        "submit",
        function(event) {

          event.preventDefault();

          analyzeThermalEvent();

        }
      );


    document
      .getElementById(
        "clear-inputs"
      )
      .addEventListener(
        "click",
        clearPredictionInputs
      );

  }
);
