/* =========================================================
   AI THERMAL EVENT INTELLIGENCE DASHBOARD
   FRONTEND CONTROLLER

   WORKFLOW:

   USER INPUT
        ↓
   /api/predict
        ↓
   AI / ML MODEL
        ↓
   EVENT TYPE + CONFIDENCE
        ↓
   MAP + TABLE + DETAILS
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

   Change this URL when your teammate gives you
   the deployed FastAPI backend URL.

   Example:

   https://your-backend.onrender.com/api/predict
*/

const API_URL = "/api/predict";


/* =========================================================
   INITIALIZE MAP
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
   GET ELEMENT VALUE
========================================================= */

function getInputValue(id) {

  const element =
    document.getElementById(id);

  if (!element) {
    return "";
  }

  return element.value.trim();

}


/* =========================================================
   GET NUMBER
========================================================= */

function getInputNumber(id) {

  const value =
    getInputValue(id);

  if (value === "") {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;

}


/* =========================================================
   COLLECT USER INPUT
========================================================= */

function collectPredictionInput() {

  return {

    source_id:
      getInputValue("source_id"),

    latitude:
      getInputNumber("latitude"),

    longitude:
      getInputNumber("longitude"),


    /* THERMAL */

    mean_frp:
      getInputNumber("mean_frp"),

    max_frp:
      getInputNumber("max_frp"),

    mean_brightness:
      getInputNumber("mean_brightness"),

    max_brightness:
      getInputNumber("max_brightness"),


    /* INDUSTRIAL / GIS */

    mean_distance_to_industry_km:
      getInputNumber(
        "mean_distance_to_industry_km"
      ),

    min_distance_to_industry_km:
      getInputNumber(
        "min_distance_to_industry_km"
      ),

    mean_industrial_facilities_1km:
      getInputNumber(
        "mean_industrial_facilities_1km"
      ),

    mean_industrial_facilities_5km:
      getInputNumber(
        "mean_industrial_facilities_5km"
      ),

    industrial_land_ratio:
      getInputNumber(
        "industrial_land_ratio"
      ),

    forest_land_ratio:
      getInputNumber(
        "forest_land_ratio"
      ),

    agricultural_land_ratio:
      getInputNumber(
        "agricultural_land_ratio"
      ),

    nearest_facility_type:
      getInputValue(
        "nearest_facility_type"
      ),

    nearest_refinery_km:
      getInputNumber(
        "nearest_refinery_km"
      ),

    nearest_powerplant_km:
      getInputNumber(
        "nearest_powerplant_km"
      ),

    nearest_mine_km:
      getInputNumber(
        "nearest_mine_km"
      ),

    nearest_industrial_area_km:
      getInputNumber(
        "nearest_industrial_area_km"
      ),

    landcover_code:
      getInputNumber(
        "landcover_code"
      ),

    landcover_class:
      getInputValue(
        "landcover_class"
      ),


    /* TEMPORAL */

    first_detection:
      getInputValue(
        "first_detection"
      ),

    last_detection:
      getInputValue(
        "last_detection"
      ),

    total_detections:
      getInputNumber(
        "total_detections"
      ),

    active_days:
      getInputNumber(
        "active_days"
      ),

    observation_span_days:
      getInputNumber(
        "observation_span_days"
      ),

    recurrence_rate:
      getInputNumber(
        "recurrence_rate"
      ),

    detections_per_span_day:
      getInputNumber(
        "detections_per_span_day"
      ),

    mean_gap_hours:
      getInputNumber(
        "mean_gap_hours"
      ),

    std_gap_hours:
      getInputNumber(
        "std_gap_hours"
      ),

    median_gap_hours:
      getInputNumber(
        "median_gap_hours"
      ),

    min_gap_hours:
      getInputNumber(
        "min_gap_hours"
      ),

    max_gap_hours:
      getInputNumber(
        "max_gap_hours"
      ),

    temporal_regularity:
      getInputNumber(
        "temporal_regularity"
      ),

    max_active_days_7d:
      getInputNumber(
        "max_active_days_7d"
      ),

    max_active_days_14d:
      getInputNumber(
        "max_active_days_14d"
      ),

    max_active_days_30d:
      getInputNumber(
        "max_active_days_30d"
      ),

    observation_days:
      getInputNumber(
        "observation_days"
      )

  };

}


/* =========================================================
   VALIDATE INPUT
========================================================= */

function validatePredictionInput(data) {

  const requiredFields = [

    "source_id",

    "latitude",

    "longitude",

    "mean_frp",

    "max_frp",

    "mean_brightness",

    "max_brightness",

    "mean_distance_to_industry_km",

    "min_distance_to_industry_km",

    "mean_industrial_facilities_1km",

    "mean_industrial_facilities_5km",

    "industrial_land_ratio",

    "forest_land_ratio",

    "agricultural_land_ratio",

    "nearest_refinery_km",

    "nearest_powerplant_km",

    "nearest_mine_km",

    "nearest_industrial_area_km",

    "landcover_code",

    "total_detections",

    "active_days",

    "observation_span_days",

    "recurrence_rate",

    "detections_per_span_day",

    "mean_gap_hours",

    "std_gap_hours",

    "median_gap_hours",

    "min_gap_hours",

    "max_gap_hours",

    "temporal_regularity",

    "max_active_days_7d",

    "max_active_days_14d",

    "max_active_days_30d",

    "observation_days"

  ];


  for (
    const field of requiredFields
  ) {

    if (
      data[field] === null ||
      data[field] === undefined ||
      data[field] === ""
    ) {

      return {
        valid: false,
        message:
          `Please enter: ${field}`
      };

    }

  }


  return {
    valid: true,
    message: ""
  };

}


/* =========================================================
   SEND TO BACKEND
========================================================= */

async function predictEvent(data) {

  /*
     REAL BACKEND REQUEST

     Your FastAPI backend should receive JSON
     and return something like:

     {
       "event_type": "Industrial Fire",
       "confidence": 94.2
     }
  */

  const response =
    await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(data)
      }
    );


  if (!response.ok) {

    throw new Error(
      `Backend returned ${response.status}`
    );

  }


  return await response.json();

}


/* =========================================================
   DEMO PREDICTION FALLBACK
========================================================= */

function demoPrediction(data) {

  /*
     This is ONLY a temporary frontend demo.

     Once the backend is connected,
     predictEvent() will be used instead.

     The demo uses industrial proximity,
     industrial land ratio and thermal intensity
     only to demonstrate the UI.
  */


  let industrialScore = 0;

  let forestScore = 0;

  let agriculturalScore = 0;


  if (
    data.industrial_land_ratio >= 0.4
  ) {

    industrialScore += 3;

  }


  if (
    data.mean_distance_to_industry_km <= 2
  ) {

    industrialScore += 3;

  }


  if (
    data.min_distance_to_industry_km <= 1
  ) {

    industrialScore += 2;

  }


  if (
    data.mean_industrial_facilities_1km >= 1
  ) {

    industrialScore += 2;

  }


  if (
    data.max_frp >= 100
  ) {

    industrialScore += 1;

  }


  if (
    data.forest_land_ratio >= 0.5
  ) {

    forestScore += 5;

  }


  if (
    data.agricultural_land_ratio >= 0.5
  ) {

    agriculturalScore += 5;

  }


  let type;

  let score;


  if (
    industrialScore >=
    forestScore &&
    industrialScore >=
    agriculturalScore
  ) {

    type =
      "Industrial Fire";

    score =
      Math.min(
        98,
        70 +
        industrialScore * 3
      );

  }

  else if (
    forestScore >=
    agriculturalScore
  ) {

    type =
      "Forest/Natural";

    score =
      Math.min(
        97,
        70 +
        forestScore * 4
      );

  }

  else {

    type =
      "Agricultural";

    score =
      Math.min(
        97,
        70 +
        agriculturalScore * 4
      );

  }


  return {

    event_type: type,

    confidence: score,

    demo: true

  };

}


/* =========================================================
   SHOW PREDICTION
========================================================= */

function showPrediction(result, inputData) {

  const typeElement =
    document.getElementById(
      "prediction-type"
    );


  const confidenceElement =
    document.getElementById(
      "prediction-confidence"
    );


  const fillElement =
    document.getElementById(
      "prediction-confidence-fill"
    );


  const statusElement =
    document.getElementById(
      "prediction-status"
    );


  const messageElement =
    document.getElementById(
      "prediction-message"
    );


  const type =
    result.event_type ||
    result.predicted_event_type ||
    result.classification ||
    "Other";


  let confidence =
    Number(
      result.confidence ??
      result.confidence_pct ??
      result.prediction_confidence ??
      0
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


  const color =
    getEventColor(type);


  typeElement.textContent =
    type;


  typeElement.style.color =
    color;


  confidenceElement.textContent =
    `${confidence.toFixed(1)}%`;


  fillElement.style.width =
    `${confidence}%`;


  fillElement.style.background =
    color;


  fillElement.style.boxShadow =
    `0 0 12px ${color}`;


  statusElement.textContent =
    result.demo
      ? "DEMO PREDICTION"
      : "MODEL PREDICTION";


  messageElement.textContent =
    result.demo
      ? "Frontend demo result. Connect the FastAPI backend for the actual trained ML prediction."
      : "Prediction generated by the AI classification model.";


  /*
     Add event to dashboard
  */

  const event = {

    ...inputData,

    predicted_event_type:
      normalizeEventType(type),

    confidence:
      confidence

  };


  /*
     Remove previous event with same source ID
     before adding updated prediction.
  */

  allEvents =
    allEvents.filter(
      e =>
        e.source_id !==
        event.source_id
    );


  allEvents.push(event);


  filteredEvents =
    [...allEvents];


  populateLandCoverFilter();

  updateDashboard();

  renderMarkers();

  renderTable();

  showEventDetails(event);

}


/* =========================================================
   NORMALIZE EVENT TYPE
========================================================= */

function normalizeEventType(type) {

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
   ANALYZE EVENT
========================================================= */

async function handlePrediction(event) {

  event.preventDefault();


  const button =
    document.getElementById(
      "analyze-button"
    );


  const data =
    collectPredictionInput();


  const validation =
    validatePredictionInput(data);


  if (!validation.valid) {

    alert(
      validation.message
    );

    return;

  }


  button.disabled =
    true;


  button.innerHTML = `

    <i class="fa-solid fa-spinner fa-spin"></i>

    ANALYZING...

  `;


  try {

    /*
       Try the real backend first.
    */

    let result;


    try {

      result =
        await predictEvent(data);

    }

    catch (backendError) {

      console.warn(
        "Backend unavailable. Using demo prediction.",
        backendError
      );


      /*
         Temporary fallback so the frontend
         can still be demonstrated.
      */

      result =
        demoPrediction(data);

    }


    showPrediction(
      result,
      data
    );

  }

  catch (error) {

    console.error(error);


    document.getElementById(
      "prediction-status"
    ).textContent =
      "PREDICTION ERROR";


    document.getElementById(
      "prediction-message"
    ).textContent =
      "Unable to process the thermal event.";


    alert(
      "Prediction failed. Check the backend connection."
    );

  }

  finally {

    button.disabled =
      false;


    button.innerHTML = `

      <i class="fa-solid fa-brain"></i>

      ANALYZE THERMAL EVENT

    `;

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


  const currentValue =
    select.value;


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
              e.landcover ||
              e.landcover_class
          )
          .filter(Boolean)
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


  if (
    values.includes(
      currentValue
    )
  ) {

    select.value =
      currentValue;

  }

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

        const matchesType =
          type === "ALL" ||
          event.predicted_event_type ===
          type;


        const matchesSearch =
          !search ||
          String(
            event.source_id
          )
            .toLowerCase()
            .includes(search);


        const eventLandcover =
          event.landcover ||
          event.landcover_class ||
          "Unknown";


        const matchesLandcover =
          landcover === "ALL" ||
          eventLandcover ===
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
   POPUP
========================================================= */

function createPopup(event) {

  const type =
    event.predicted_event_type ||
    "Other";


  return `

    <div style="min-width:210px">

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
          event.landcover ||
          event.landcover_class ||
          "Unknown"
        )}
      </div>


      <div>
        <b>Mean FRP:</b>
        ${formatNumber(
          event.mean_frp
        )}
      </div>


      <button
        onclick="
          showEventById(
            '${escapeAttribute(
              event.source_id
            )}'
          )
        "
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
   EVENT COLORS
========================================================= */

function getEventColor(type) {

  const normalized =
    normalizeEventType(type);


  switch (
    normalized
  ) {

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
   EVENT BADGES
========================================================= */

function getBadgeClass(type) {

  const normalized =
    normalizeEventType(type);


  switch (
    normalized
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
          style="
            text-align:center;
            padding:40px;
            color:#64748b;
          "
        >

          No thermal sources
          match the selected filters.

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
        normalizeEventType(
          event.predicted_event_type
        );


      const landcover =
        event.landcover ||
        event.landcover_class ||
        "Unknown";


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
            landcover
          )}

        </td>


        <td>

          ${formatNumber(
            event.mean_frp
          )}

        </td>


        <td>

          ${
            event.active_days !==
            null &&
            event.active_days !==
            undefined

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
        function(e) {

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

function showEventDetails(
  event
) {

  const container =
    document.getElementById(
      "details-content"
    );


  const sourceLabel =
    document.getElementById(
      "selected-source-label"
    );


  if (
    !container ||
    !sourceLabel
  ) {

    return;

  }


  sourceLabel.textContent =
    event.source_id;


  const type =
    normalizeEventType(
      event.predicted_event_type
    );


  const color =
    getEventColor(type);


  container.className =
    "details-content";


  container.innerHTML = `

    <div class="detail-layout">


      <!-- CLASSIFICATION -->

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


        <div
          class="classification-confidence"
        >

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



      <!-- FEATURES -->

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
          event.landcover ||
          event.landcover_class
        )}


        ${detailItem(
          "Nearest Facility",
          event.nearest_facility_type
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
          "Mean Distance to Industry",
          formatDistance(
            event.mean_distance_to_industry_km
          )
        )}


        ${detailItem(
          "Minimum Distance to Industry",
          formatDistance(
            event.min_distance_to_industry_km
          )
        )}


        ${detailItem(
          "Facilities ≤1 km",
          formatNumber(
            event.mean_industrial_facilities_1km
          )
        )}


        ${detailItem(
          "Facilities ≤5 km",
          formatNumber(
            event.mean_industrial_facilities_5km
          )
        )}


        ${detailItem(
          "Nearest Refinery",
          formatDistance(
            event.nearest_refinery_km
          )
        )}


        ${detailItem(
          "Nearest Power Plant",
          formatDistance(
            event.nearest_powerplant_km
          )
        )}


        ${detailItem(
          "Nearest Mine",
          formatDistance(
            event.nearest_mine_km
          )
        )}


        ${detailItem(
          "Nearest Industrial Area",
          formatDistance(
            event.nearest_industrial_area_km
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
          formatNumber(
            event.mean_gap_hours
          ) + " hours"
        )}


        ${detailItem(
          "Temporal Regularity",
          formatNumber(
            event.temporal_regularity
          )
        )}


        ${detailItem(
          "Max Active Days 7d",
          formatNumber(
            event.max_active_days_7d
          )
        )}


        ${detailItem(
          "Max Active Days 14d",
          formatNumber(
            event.max_active_days_14d
          )
        )}


        ${detailItem(
          "Max Active Days 30d",
          formatNumber(
            event.max_active_days_30d
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

        ${
          value === null ||
          value === undefined ||
          value === "" ||
          value === "NaN hours"

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
   FORMATTING
========================================================= */

function formatNumber(
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


  return Number(value)
    .toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2
      }
    );

}


/* =========================================================
   DISTANCE
========================================================= */

function formatDistance(
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


  return `${Number(value).toFixed(2)} km`;

}


/* =========================================================
   DAYS
========================================================= */

function formatDays(
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


  return `${Number(value).toFixed(2)} days`;

}


/* =========================================================
   COORDINATE
========================================================= */

function formatCoordinate(
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


  return Number(value)
    .toFixed(5);

}


/* =========================================================
   CONFIDENCE
========================================================= */

function formatConfidence(
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


  let confidence =
    Number(value);


  if (
    confidence >= 0 &&
    confidence <= 1
  ) {

    confidence *= 100;

  }


  return `${confidence.toFixed(1)}%`;

}


/* =========================================================
   SAFE CONFIDENCE
========================================================= */

function safeConfidence(
  value
) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
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
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
  value
) {

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
   CLEAR FORM
========================================================= */

function clearPredictionForm() {

  const form =
    document.getElementById(
      "prediction-form"
    );


  if (form) {

    form.reset();

  }


  document.getElementById(
    "prediction-status"
  ).textContent =
    "WAITING FOR INPUT";


  document.getElementById(
    "prediction-type"
  ).textContent =
    "—";


  document.getElementById(
    "prediction-type"
  ).style.color =
    "";


  document.getElementById(
    "prediction-confidence"
  ).textContent =
    "—";


  document.getElementById(
    "prediction-confidence-fill"
  ).style.width =
    "0%";


  document.getElementById(
    "prediction-message"
  ).textContent =
    "Enter the thermal event features and click Analyze Event.";

}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {

  document.getElementById(
    "type-filter"
  ).value =
    "ALL";


  document.getElementById(
    "search-input"
  ).value =
    "";


  document.getElementById(
    "landcover-filter"
  ).value =
    "ALL";


  document.getElementById(
    "confidence-filter"
  ).value =
    "0";


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
   EVENT LISTENERS
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    initializeMap();


    /*
       AI prediction form
    */

    document
      .getElementById(
        "prediction-form"
      )
      .addEventListener(
        "submit",
        handlePrediction
      );


    /*
       Clear form
    */

    document
      .getElementById(
        "clear-form-button"
      )
      .addEventListener(
        "click",
        clearPredictionForm
      );


    /*
       Filters
    */

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


    /*
       Initial dashboard
    */

    updateDashboard();

    renderMarkers();

    renderTable();

  }
);