from pathlib import Path

import numpy as np
import pandas as pd


INPUT_PATH = (
    "data/processed/"
    "clustered_detections.csv"
)

OUTPUT_PATH = (
    "data/processed/"
    "source_temporal_features.csv"
)


def calculate_temporal_features(group):

    group = group.sort_values(
        "detection_datetime"
    )

    timestamps = (
        group[
            "detection_datetime"
        ]
        .dropna()
        .to_numpy()
    )

    if len(timestamps) > 1:

        gaps = (
            np.diff(timestamps)
            / np.timedelta64(1, "h")
        )

        return pd.Series({

            "mean_gap_hours":
                gaps.mean(),

            "std_gap_hours":
                gaps.std(),

            "median_gap_hours":
                np.median(gaps),

            "min_gap_hours":
                gaps.min(),

            "max_gap_hours":
                gaps.max()
        })

    return pd.Series({

        "mean_gap_hours":
            np.nan,

        "std_gap_hours":
            np.nan,

        "median_gap_hours":
            np.nan,

        "min_gap_hours":
            np.nan,

        "max_gap_hours":
            np.nan
    })


def calculate_recurrence_windows(group):

    dates = (
        pd.to_datetime(
            group["detection_datetime"]
        )
        .dt.normalize()
        .drop_duplicates()
        .sort_values()
    )

    if len(dates) == 0:

        return pd.Series({

            "max_active_days_7d":
                0,

            "max_active_days_14d":
                0,

            "max_active_days_30d":
                0
        })

    def max_active_days(
        window_days
    ):

        maximum = 0

        for start in dates:

            end = (
                start
                + pd.Timedelta(
                    days=window_days - 1
                )
            )

            count = (
                (dates >= start)
                &
                (dates <= end)
            ).sum()

            maximum = max(
                maximum,
                int(count)
            )

        return maximum

    return pd.Series({

        "max_active_days_7d":
            max_active_days(7),

        "max_active_days_14d":
            max_active_days(14),

        "max_active_days_30d":
            max_active_days(30)
    })


def main():

    Path(
        "data/processed"
    ).mkdir(
        parents=True,
        exist_ok=True
    )

    df = pd.read_csv(
        INPUT_PATH
    )

    required_columns = [
        "source_id",
        "event_id",
        "detection_datetime",
        "frp_mw"
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            f"Missing columns: "
            f"{missing_columns}"
        )

    df["detection_datetime"] = (
        pd.to_datetime(
            df["detection_datetime"],
            errors="coerce",
            utc=True
        )
    )

    df = df.dropna(
        subset=[
            "source_id",
            "detection_datetime"
        ]
    ).copy()

    df["date"] = (
        df["detection_datetime"]
        .dt.date
    )

    observation_start = (
        df["detection_datetime"].min()
    )

    observation_end = (
        df["detection_datetime"].max()
    )

    observation_days = (
        observation_end.date()
        - observation_start.date()
    ).days + 1

    # ----------------------------------------
    # Basic source features
    # ----------------------------------------

    source_features = (
        df.groupby("source_id")
        .agg(

            first_detection=(
                "detection_datetime",
                "min"
            ),

            last_detection=(
                "detection_datetime",
                "max"
            ),

            total_detections=(
                "event_id",
                "count"
            ),

            active_days=(
                "date",
                "nunique"
            ),

            mean_frp=(
                "frp_mw",
                "mean"
            ),

            max_frp=(
                "frp_mw",
                "max"
            )
        )
        .reset_index()
    )

    # ----------------------------------------
    # Observation span
    # ----------------------------------------

    source_features[
        "observation_span_days"
    ] = (
        (
            source_features["last_detection"]
            -
            source_features["first_detection"]
        )
        .dt.total_seconds()
        / (24 * 3600)
    )

    # ----------------------------------------
    # Recurrence rate
    # ----------------------------------------

    source_features[
        "recurrence_rate"
    ] = (
        source_features["active_days"]
        / observation_days
    ).clip(0, 1)

    # ----------------------------------------
    # Detection frequency
    # ----------------------------------------

    source_features[
        "detections_per_span_day"
    ] = (
        source_features["total_detections"]
        /
        source_features[
            "observation_span_days"
        ].clip(lower=1)
    )

    # ----------------------------------------
    # Temporal gaps
    # ----------------------------------------

    temporal_features = (
        df.groupby("source_id")
        .apply(
            calculate_temporal_features
        )
        .reset_index()
    )

    source_features = (
        source_features.merge(
            temporal_features,
            on="source_id",
            how="left"
        )
    )

    # ----------------------------------------
    # Temporal regularity
    # ----------------------------------------

    source_features["temporal_regularity"] = (
    1
    /
    (
        1
        + source_features["std_gap_hours"]
    )
    )

    source_features.loc[
        source_features["total_detections"] < 3,
        "temporal_regularity"
    ] = 0.0

    source_features["temporal_regularity"] = (
        source_features["temporal_regularity"]
        .fillna(0)
        .clip(0, 1)
    )

    # ----------------------------------------
    # Recurrence windows
    # ----------------------------------------

    recurrence_windows = (
        df.groupby("source_id")
        .apply(
            calculate_recurrence_windows
        )
        .reset_index()
    )

    source_features = (
        source_features.merge(
            recurrence_windows,
            on="source_id",
            how="left"
        )
    )

    source_features[
        "observation_days"
    ] = observation_days

    # ----------------------------------------
    # Save
    # ----------------------------------------

    source_features.to_csv(
        OUTPUT_PATH,
        index=False
    )

    print(
        f"Observation days: "
        f"{observation_days}"
    )

    print(
        f"Sources processed: "
        f"{len(source_features)}"
    )

    print(
        "\nGenerated columns:"
    )

    print(
        source_features.columns.tolist()
    )

    print(
        f"\nSaved: {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()