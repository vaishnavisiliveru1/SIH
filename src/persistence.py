from pathlib import Path

import numpy as np
import pandas as pd


CLUSTERED_PATH = (
    "data/processed/"
    "clustered_detections.csv"
)

TEMPORAL_PATH = (
    "data/processed/"
    "source_temporal_features.csv"
)

PERSISTENCE_OUTPUT = (
    "data/processed/"
    "source_persistence_features.csv"
)

TIMELINE_OUTPUT = (
    "data/processed/"
    "event_timeline.csv"
)


# ----------------------------------------
# Persistence score configuration
# ----------------------------------------

# Transparent score weights.
RECURRENCE_WEIGHT = 0.50
SPAN_WEIGHT = 0.30
FREQUENCY_WEIGHT = 0.20

# Presentation thresholds for LOW/MEDIUM/HIGH.
DEFAULT_LOW_THRESHOLD = 0.30
DEFAULT_HIGH_THRESHOLD = 0.60

# Validation-tuned persistent/transient threshold.
# Obtained from tune_persistance.py.
PERSISTENCE_THRESHOLD = 0.23

# Frequency normalization cap.
FREQUENCY_CAP = 10


def classify_persistence(
    score,
    low_threshold=DEFAULT_LOW_THRESHOLD,
    high_threshold=DEFAULT_HIGH_THRESHOLD
):

    if score < low_threshold:
        return "LOW"

    if score < high_threshold:
        return "MEDIUM"

    return "HIGH"


def main():

    Path(
        "data/processed"
    ).mkdir(
        parents=True,
        exist_ok=True
    )

    # ----------------------------------------
    # 1. Load data
    # ----------------------------------------

    clustered_df = pd.read_csv(
        CLUSTERED_PATH
    )

    source_features = pd.read_csv(
        TEMPORAL_PATH
    )

    required_source_columns = [

        "source_id",

        "total_detections",

        "active_days",

        "observation_span_days",

        "observation_days"
    ]

    missing_columns = [
        column
        for column in required_source_columns
        if column not in source_features.columns
    ]

    if missing_columns:

        raise ValueError(
            f"Missing temporal columns: "
            f"{missing_columns}"
        )

    # ----------------------------------------
    # 2. Recurrence component
    # ----------------------------------------

    source_features[
        "recurrence_component"
    ] = (
        source_features["active_days"]
        /
        source_features[
            "observation_days"
        ]
    ).clip(0, 1)

    # ----------------------------------------
    # 3. Span component
    # ----------------------------------------

    observation_days = (
        source_features[
            "observation_days"
        ].iloc[0]
    )

    if observation_days > 1:

        source_features[
            "span_component"
        ] = (
            source_features[
                "observation_span_days"
            ]
            /
            (observation_days - 1)
        ).clip(0, 1)

    else:

        source_features[
            "span_component"
        ] = 0.0

    # ----------------------------------------
    # 4. Detection frequency
    # ----------------------------------------

    source_features[
        "detections_per_active_day"
    ] = (
        source_features[
            "total_detections"
        ]
        /
        source_features[
            "active_days"
        ].clip(lower=1)
    )

    source_features[
        "detection_frequency_component"
    ] = (
        np.log1p(
            source_features[
                "detections_per_active_day"
            ]
        )
        /
        np.log1p(
            FREQUENCY_CAP
        )
    ).clip(0, 1)

    # ----------------------------------------
    # 5. Persistence score
    # ----------------------------------------

    source_features[
        "persistence_score"
    ] = (

        RECURRENCE_WEIGHT
        *
        source_features[
            "recurrence_component"
        ]

        +

        SPAN_WEIGHT
        *
        source_features[
            "span_component"
        ]

        +

        FREQUENCY_WEIGHT
        *
        source_features[
            "detection_frequency_component"
        ]

    ).clip(0, 1)

    # ----------------------------------------
    # 6. Validation-tuned decision
    # ----------------------------------------

    source_features[
        "persistent_flag"
    ] = (
        source_features[
            "persistence_score"
        ]
        >= PERSISTENCE_THRESHOLD
    )

    # ----------------------------------------
    # 7. Presentation category
    # ----------------------------------------

    source_features[
        "persistence_category"
    ] = (
        source_features[
            "persistence_score"
        ]
        .apply(
            classify_persistence
        )
    )

    # ----------------------------------------
    # 8. Save persistence features
    # ----------------------------------------

    source_features.to_csv(
        PERSISTENCE_OUTPUT,
        index=False
    )

    # ----------------------------------------
    # 9. Prepare timeline
    # ----------------------------------------

    clustered_df[
        "detection_datetime"
    ] = pd.to_datetime(
        clustered_df[
            "detection_datetime"
        ],
        errors="coerce",
        utc=True
    )

    timeline = clustered_df.merge(

        source_features[
            [
                "source_id",
                "persistence_score",
                "persistent_flag",
                "persistence_category"
            ]
        ],

        on="source_id",

        how="left"
    )

    timeline = timeline.sort_values(
        [
            "source_id",
            "detection_datetime"
        ]
    )
    timeline["previous_frp_mw"] = (
        timeline
        .groupby("source_id")["frp_mw"]
        .shift(1)
    )

    timeline["frp_change_mw"] = (
        timeline["frp_mw"]
        - timeline["previous_frp_mw"]
    )

    # ----------------------------------------
    # 10. Cumulative detections
    # ----------------------------------------

    timeline[
        "cumulative_detections"
    ] = (
        timeline
        .groupby("source_id")
        .cumcount()
        + 1
    )

    # ----------------------------------------
    # 11. First detection
    # ----------------------------------------

    timeline[
        "first_detection"
    ] = (
        timeline
        .groupby("source_id")[
            "detection_datetime"
        ]
        .transform("min")
    )

    # ----------------------------------------
    # 12. Days since first detection
    # ----------------------------------------

    timeline[
        "days_since_first_detection"
    ] = (
        (
            timeline[
                "detection_datetime"
            ]
            -
            timeline[
                "first_detection"
            ]
        )
        .dt.total_seconds()
        / (24 * 3600)
    )

    # ----------------------------------------
    # 13. Previous detection
    # ----------------------------------------

    timeline[
        "previous_detection"
    ] = (
        timeline
        .groupby("source_id")[
            "detection_datetime"
        ]
        .shift(1)
    )

    # ----------------------------------------
    # 14. Gap since previous detection
    # ----------------------------------------

    timeline[
        "hours_since_previous_detection"
    ] = (
        (
            timeline[
                "detection_datetime"
            ]
            -
            timeline[
                "previous_detection"
            ]
        )
        .dt.total_seconds()
        / 3600
    )

    # ----------------------------------------
    # 15. Save timeline
    # ----------------------------------------

    timeline.to_csv(
        TIMELINE_OUTPUT,
        index=False
    )

    # ----------------------------------------
    # 16. Print summary
    # ----------------------------------------

    print(
        "\nPersistence categories:"
    )

    print(
        source_features[
            "persistence_category"
        ].value_counts()
    )

    print(
        "\nPersistence score:"
    )

    print(
        source_features[
            "persistence_score"
        ].describe()
    )

    print(
        f"\nTuned persistence threshold: "
        f"{PERSISTENCE_THRESHOLD}"
    )

    print(
        "\nPersistent / transient:"
    )

    print(
        source_features[
            "persistent_flag"
        ].value_counts()
    )

    print(
        f"\nSaved: "
        f"{PERSISTENCE_OUTPUT}"
    )

    print(
        f"Saved: "
        f"{TIMELINE_OUTPUT}"
    )


if __name__ == "__main__":
    main()