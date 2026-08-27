# SIH
# SIH# Remote Sensing Documentation

## 1. Purpose

This directory documents the remote-sensing data and satellite context
considered for the thermal anomaly persistence prototype.

The current prototype is primarily based on NASA FIRMS thermal anomaly
detections. Satellite-image deep learning is intentionally not included
in the core persistence pipeline because the required persistence logic
can be implemented using thermal detections, spatial clustering, temporal
features, and FRP information.

Satellite and land-cover layers can be added later as contextual
information.

---

## 2. Primary Remote-Sensing Data

The primary input to the persistence pipeline is NASA FIRMS thermal
anomaly data.

The FIRMS detections provide the thermal observations used to identify
and track potential recurring thermal sources.

The cleaned FIRMS dataset is used by:

    data/firms_clean.csv

The clustering pipeline produces:

    data/processed/clustered_detections.csv

---

## 3. FIRMS Fields Used

The clustering and temporal-processing code expects the following
important fields:

- event_id
- acq_date
- acq_time_utc
- latitude
- longitude
- frp_mw

These fields are used as follows:

### event_id

Unique identifier for an individual thermal detection.

### acq_date

Acquisition date of the thermal observation.

### acq_time_utc

Acquisition time in UTC.

### latitude / longitude

Geographic location of the thermal detection.

These coordinates are used for spatial clustering.

### frp_mw

Fire Radiative Power / thermal intensity measure used to calculate:

- mean FRP
- maximum FRP
- FRP trends in the event timeline

---

## 4. Spatial and Temporal Clustering

The prototype groups detections that are likely to represent the same
physical thermal source.

Current clustering parameters:

    Spatial distance: 0.5 km
    Temporal distance: 24 hours

The clustering process uses a haversine-distance neighbourhood search
and a union-find procedure.

Two detections are connected when:

1. Their geographic distance is within 0.5 km.
2. Their detection times are within 24 hours.

Connected detections receive the same source_id.

Example:

    SOURCE_0001
        detection 1
        detection 2
        detection 3
        ...

This prevents repeated observations of the same source from being
treated as completely unrelated events.

The resulting file is:

    data/processed/clustered_detections.csv

---

## 5. Temporal Observation Period

The current dataset contains:

    Valid detections: 1382
    Sources created: 563
    Observation period: 7 days

The temporal feature pipeline calculates source-level features from the
clustered detections.

Output:

    data/processed/source_temporal_features.csv

---

## 6. Temporal Features

The current prototype calculates:

- first_detection
- last_detection
- total_detections
- active_days
- mean_frp
- max_frp
- observation_span_days
- recurrence_rate
- detections_per_span_day
- mean_gap_hours
- std_gap_hours
- median_gap_hours
- min_gap_hours
- max_gap_hours
- temporal_regularity
- max_active_days_7d
- max_active_days_14d
- max_active_days_30d
- observation_days

These features provide the temporal context required to distinguish
repeated/persistent thermal sources from short-lived detections.

---

## 7. Persistence Score

The prototype uses a transparent weighted persistence score.

The current weights are:

    Recurrence: 50%
    Observation span: 30%
    Detection frequency: 20%

Therefore:

    Persistence Score =
        0.50 × recurrence_component
      + 0.30 × span_component
      + 0.20 × detection_frequency_component

The score is clipped to the range:

    0 to 1

The frequency component uses logarithmic normalization with a frequency
cap of 10 detections per active day.

---

## 8. Validation-Tuned Threshold

The persistent/transient decision uses a threshold selected using the
validation dataset.

The current validation result selected:

    Persistence threshold: 0.23

The threshold was selected by testing candidate thresholds from 0.10
to 0.90 and selecting the threshold with the highest F1 score, with
recall used as the secondary sorting criterion.

Current validation result:

    Accuracy: 1.000
    Precision: 1.000
    Recall: 1.000
    F1: 1.000

The validation dataset contains:

    16 labelled sources

The perfect result applies only to the current validation sample and
should not be interpreted as a claim of 100% real-world classification
accuracy.

---

## 9. Satellite and Land-Cover Context

Satellite imagery and land-cover information are considered optional
contextual layers for the current prototype.

They are not required for calculating the core persistence score.

Potential future contextual layers include:

- land-cover classification
- Sentinel-2 imagery
- Landsat imagery
- Google Earth Engine derived layers
- vegetation or built-up-area information

These layers could help provide additional context about whether a
persistent thermal source is located in an industrial, agricultural,
forest, or other land-use area.

No satellite-image deep learning model is currently required by the
persistence pipeline.

---

## 10. Google Earth Engine

Google Earth Engine is considered an optional future data source.

It can be used to retrieve or process:

- land-cover information
- Sentinel-2 imagery
- Landsat imagery
- vegetation indices
- other satellite-derived contextual layers

Google Earth Engine is not currently required for the core persistence
calculation.

---

## 11. QGIS

QGIS can be used to visually inspect:

- FIRMS thermal detections
- clustered source locations
- source_id assignments
- industrial or land-cover context
- spatial distribution of persistent sources

QGIS is useful for validating whether the 0.5 km spatial clustering
behaves sensibly.

---

## 12. Current Remote-Sensing Pipeline

The current prototype follows:

    NASA FIRMS
        |
        v
    firms_clean.csv
        |
        v
    Spatial + temporal clustering
        |
        v
    clustered_detections.csv
        |
        v
    Temporal feature extraction
        |
        v
    source_temporal_features.csv
        |
        v
    Persistence score
        |
        v
    Validation threshold
        |
        v
    Persistent / Transient
        |
        v
    event_timeline.csv

---

## 13. Current Limitations

The current prototype uses a relatively short seven-day observation
period.

This is sufficient to demonstrate the persistence-processing pipeline,
but longer observation periods would provide stronger evidence of
long-term recurrence.

The current prototype also does not use satellite-image deep learning.

This is intentional because the core persistence pipeline is designed
to work before introducing more computationally expensive image-based
models.

Future improvements may include longer historical datasets, land-cover
layers, satellite imagery, and additional contextual features.

---

## 14. Remote-Sensing Data Status

Current status:

    FIRMS thermal detections       Available
    Spatial clustering             Implemented
    Temporal clustering            Implemented
    FRP analysis                   Implemented
    Temporal persistence           Implemented
    Land-cover context             Optional / future
    Satellite imagery              Optional / future
    Satellite deep learning        Not required for core prototype
    QGIS validation                Available as a validation tool
    Google Earth Engine            Optional
