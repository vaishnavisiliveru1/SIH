# Persistence Validation Report

## 1. Overview

This report documents the validation of the thermal-source persistence
pipeline developed for the prototype.

The objective is to determine whether repeated thermal detections can
be grouped into the same source and whether a transparent persistence
score can distinguish persistent sources from transient sources.

The pipeline uses:

- NASA FIRMS thermal detections
- spatial clustering
- temporal clustering
- temporal recurrence
- detection frequency
- observation span
- FRP statistics
- temporal regularity
- recurrence-window features

Satellite-image deep learning is not required for the core pipeline.

---

# 2. Input Data

The primary cleaned FIRMS dataset is:

    data/firms_clean.csv

The clustering pipeline generated:

    data/processed/clustered_detections.csv

The clustering execution produced:

    Valid detections: 1382
    Sources created: 563

Therefore:

    1382 thermal detections
    were grouped into
    563 candidate thermal sources.

---

# 3. Spatial and Temporal Clustering

The clustering implementation uses:

    Spatial radius: 0.5 km
    Temporal window: 24 hours

A detection is connected to another detection when both conditions
are satisfied:

1. The two detections are within 0.5 km.
2. The two detections occur within 24 hours.

Connected detections are assigned the same source_id.

The implementation uses haversine distance for geographic proximity and
a union-find structure to form connected source clusters.

Output:

    data/processed/clustered_detections.csv

Example source identifiers:

    SOURCE_0001
    SOURCE_0002
    SOURCE_0003
    ...

This allows repeated observations of the same approximate location to
be analysed as one source rather than as unrelated events.

---

# 4. Temporal Feature Extraction

The temporal feature pipeline is implemented in:

    src/temporal_features.py

Input:

    data/processed/clustered_detections.csv

Output:

    data/processed/source_temporal_features.csv

The current execution reported:

    Observation days: 7
    Sources processed: 563

The following features are generated.

## 4.1 Activity Features

- total_detections
- active_days

These measure how frequently a source was detected and on how many
different days it was active.

## 4.2 Recurrence Features

- recurrence_rate
- observation_span_days
- max_active_days_7d
- max_active_days_14d
- max_active_days_30d

These describe whether detections recur over time.

## 4.3 FRP Features

- mean_frp
- max_frp

These provide information about the thermal intensity of a source.

## 4.4 Detection Frequency

- detections_per_span_day

The persistence stage also calculates:

- detections_per_active_day
- detection_frequency_component

## 4.5 Temporal Gap Features

- mean_gap_hours
- std_gap_hours
- median_gap_hours
- min_gap_hours
- max_gap_hours

## 4.6 Temporal Regularity

The current implementation derives temporal regularity from the
standard deviation of detection gaps.

Sources with fewer than three detections receive a temporal regularity
value of zero.

---

# 5. Persistence Score

The persistence score is intentionally transparent.

The current implementation uses:

    RECURRENCE_WEIGHT = 0.50
    SPAN_WEIGHT       = 0.30
    FREQUENCY_WEIGHT  = 0.20

Therefore:

    Persistence Score =
        0.50 × recurrence_component
      + 0.30 × span_component
      + 0.20 × detection_frequency_component

The resulting score is constrained to:

    0 ≤ persistence_score ≤ 1

This makes the score easy to interpret and reproduce.

---

# 6. Recurrence Component

The recurrence component is calculated as:

    active_days / observation_days

and clipped to the range 0 to 1.

A source detected on many observation days receives a higher recurrence
component than a source detected on only one day.

---

# 7. Observation Span Component

The observation span is based on the time between the first and last
detection of a source.

For an observation period greater than one day:

    span_component =
        observation_span_days /
        (observation_days - 1)

The value is clipped to the range 0 to 1.

This rewards sources that remain active across a larger portion of the
observation period.

---

# 8. Detection Frequency Component

Detection frequency is calculated as:

    total_detections / active_days

A logarithmic normalization is then applied using:

    FREQUENCY_CAP = 10

This prevents very high detection counts from dominating the entire
persistence score.

---

# 9. Validation Dataset

The validation labels are stored in:

    data/processed/validation/persistence_labels.csv

The validation file contains:

    source_id
    label

where label is one of:

    persistent
    transient

The tuning script found:

    Validation sources: 16

The validation sources were used to select the persistent/transient
decision threshold.

---

# 10. Threshold Tuning

The threshold tuning implementation is located in:

    src/tune_persistence.py

Candidate thresholds from 0.10 through 0.90 were evaluated.

For each threshold, the persistence score was converted into:

    persistent
    transient

The following metrics were calculated:

- accuracy
- precision
- recall
- F1 score

The best threshold was selected using F1 score, with recall used as the
secondary sorting criterion.

---

# 11. Validation Result

The selected threshold was:

    0.23

Validation results:

    Accuracy:  1.000
    Precision: 1.000
    Recall:    1.000
    F1:        1.000

Therefore the current prototype uses:

    PERSISTENCE_THRESHOLD = 0.23

The threshold is not an arbitrary final value; it was obtained by
testing candidate thresholds against the labelled validation sample.

---

# 12. Important Interpretation of the Validation Result

The validation dataset contains only:

    16 sources

Therefore, the perfect validation result should not be interpreted as
proof that the persistence system has 100% accuracy on unseen real-world
data.

The correct interpretation is:

> On the current 16-source labelled validation sample, a persistence
> threshold of 0.23 achieved an F1 score of 1.00.

A larger and more diverse validation dataset should be used for a
stronger evaluation.

---

# 13. Current Persistence Output

The persistence pipeline is implemented in:

    src/persistance.py

The execution produced:

    Persistence categories:
    LOW       516
    MEDIUM     37
    HIGH       10

Total:

    563 sources

Persistence score statistics:

    Count: 563
    Mean: 0.179203
    Standard deviation: 0.104125
    Minimum: 0.129242
    25th percentile: 0.129242
    Median: 0.129242
    75th percentile: 0.187055
    Maximum: 0.938872

The validation-tuned persistent/transient decision produced:

    Persistent: 102
    Transient: 461

Output:

    data/processed/source_persistence_features.csv

---

# 14. Persistence Categories

The prototype also provides presentation categories:

    LOW
    MEDIUM
    HIGH

Current category counts:

    LOW:     516
    MEDIUM:   37
    HIGH:     10

These categories are presentation categories based on the configured
score ranges.

The validation-tuned threshold is separately represented by:

    persistent_flag

This distinction allows the continuous persistence score and the
validation-based binary decision to coexist.

---

# 15. Event Timeline

The persistence pipeline generates:

    data/processed/event_timeline.csv

The timeline is created by combining the clustered detections with
source-level persistence information.

The timeline contains information including:

- source_id
- detection_datetime
- FRP
- persistence_score
- persistent_flag
- persistence_category
- cumulative_detections
- first_detection
- days_since_first_detection
- previous_detection
- hours_since_previous_detection

This allows the system to show how detections for a source evolve over
time.

For visualization, detection_datetime can be plotted against FRP to
show the thermal intensity trend of a source.

---

# 16. Reproducibility

The persistence pipeline can be reproduced using the following order:

    python src/clustering.py

    python src/temporal_features.py

    python src/persistance.py

    python src/tune_persistence.py

The clustering stage generates:

    data/processed/clustered_detections.csv

The temporal stage generates:

    data/processed/source_temporal_features.csv

The persistence stage generates:

    data/processed/source_persistence_features.csv
    data/processed/event_timeline.csv

The threshold tuning stage generates:

    data/validation/persistence_threshold_results.csv

---

# 17. Remote-Sensing Context

The current core persistence system relies on FIRMS thermal anomaly
detections.

Potential additional contextual information includes:

- land-cover classification
- Sentinel-2 imagery
- Landsat imagery
- Google Earth Engine derived layers

These are considered optional enhancements.

Satellite-image deep learning is intentionally excluded from the core
prototype until the persistence pipeline is stable.

Documentation for possible remote-sensing layers is available at:

    data/remote_sensing/README.md

---

# 18. Definition of Done

## Same-source detections

Status: COMPLETE

Nearby detections are clustered using:

    0.5 km spatial radius
    24 hour temporal window

The current dataset produced 563 source clusters from 1382 valid
detections.

---

## Persistence is reproducible

Status: COMPLETE

The persistence score uses fixed documented weights:

    Recurrence = 0.50
    Span       = 0.30
    Frequency  = 0.20

The persistence threshold is selected using validation data.

---

## Timeline works

Status: COMPLETE

Generated file:

    data/processed/event_timeline.csv

The timeline includes source detections, timestamps, FRP and persistence
information.

---

## Persistent and transient examples tested

Status: COMPLETE

A labelled validation dataset containing 16 sources is used by the
threshold tuning script.

Labels:

    persistent
    transient

The selected threshold achieved:

    F1 = 1.00

on the current validation sample.

---

## Satellite layers documented

Status: COMPLETE

Remote-sensing context and potential satellite/land-cover extensions are
documented in:

    data/remote_sensing/README.md

Satellite-image deep learning remains optional.

---

# 19. Current Limitations

The main limitation is the seven-day observation period.

A longer historical observation period would provide stronger evidence
for long-term persistence and recurrence.

The validation set is also small, containing only 16 labelled sources.
Therefore, additional labelled examples should be collected before
making strong claims about generalization.

The current system does not yet use satellite-image deep learning.

This is acceptable for the prototype because the core requirement is
the detection, clustering, feature extraction, persistence scoring,
validation and timeline generation pipeline.

---

# 20. Final Prototype Status

The persistence prototype currently provides:

    FIRMS thermal detections
            ↓
    Spatial + temporal clustering
            ↓
    563 candidate sources
            ↓
    Temporal feature extraction
            ↓
    Transparent persistence score
            ↓
    Validation-based threshold tuning
            ↓
    Threshold = 0.23
            ↓
    Persistent / Transient decision
            ↓
    Event timeline
            ↓
    Dashboard-ready CSV outputs

Core persistence requirements are implemented and reproducible.