from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors


INPUT_PATH = "data/firms_clean.csv"

OUTPUT_PATH = (
    "data/processed/"
    "clustered_detections.csv"
)

SPATIAL_KM = 0.5
TEMPORAL_HOURS = 24

EARTH_RADIUS_KM = 6371.0088


def parse_acquisition_time(series):
    """
    Convert FIRMS acquisition time into HH:MM format.
    Supports values such as:
        930
        0930
        930.0
        09:30
    """

    text = (
        series
        .astype(str)
        .str.strip()
    )

    has_colon = text.str.contains(
        ":",
        na=False
    )

    numeric_time = (
        pd.to_numeric(
            text.where(~has_colon),
            errors="coerce"
        )
        .fillna(0)
        .astype(int)
        .astype(str)
        .str.zfill(4)
    )

    formatted_numeric = (
        numeric_time.str[:2]
        + ":"
        + numeric_time.str[2:]
    )

    return formatted_numeric.where(
        has_colon,
        formatted_numeric
    )


def prepare_data(path):

    df = pd.read_csv(path)

    required_columns = [
        "event_id",
        "acq_date",
        "acq_time_utc",
        "latitude",
        "longitude",
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

    # Date
    df["acq_date"] = pd.to_datetime(
        df["acq_date"],
        errors="coerce"
    )

    # Time
    time_text = parse_acquisition_time(
        df["acq_time_utc"]
    )

    # Datetime
    df["detection_datetime"] = (
        pd.to_datetime(
            df["acq_date"].dt.strftime(
                "%Y-%m-%d"
            )
            + " "
            + time_text,
            errors="coerce",
            utc=True
        )
    )

    # Numeric values
    df["latitude"] = pd.to_numeric(
        df["latitude"],
        errors="coerce"
    )

    df["longitude"] = pd.to_numeric(
        df["longitude"],
        errors="coerce"
    )

    df["frp_mw"] = pd.to_numeric(
        df["frp_mw"],
        errors="coerce"
    )

    # Remove invalid rows
    df = df.dropna(
        subset=[
            "event_id",
            "detection_datetime",
            "latitude",
            "longitude"
        ]
    ).copy()

    # Valid coordinates
    df = df[
        df["latitude"].between(-90, 90)
        &
        df["longitude"].between(-180, 180)
    ].copy()

    # Remove duplicate observations
    df = df.drop_duplicates(
        subset=[
            "latitude",
            "longitude",
            "detection_datetime"
        ]
    ).reset_index(drop=True)

    return df


def create_clusters(
    df,
    spatial_km,
    temporal_hours
):

    if df.empty:

        result = df.copy()

        result["source_id"] = pd.Series(
            dtype="string"
        )

        return result

    coordinates = np.radians(
        df[
            ["latitude", "longitude"]
        ].to_numpy()
    )

    spatial_radius_rad = (
        spatial_km
        / EARTH_RADIUS_KM
    )

    model = NearestNeighbors(
        radius=spatial_radius_rad,
        metric="haversine"
    )

    model.fit(coordinates)

    neighbors = model.radius_neighbors(
        coordinates,
        return_distance=False
    )

    timestamps = (
        df["detection_datetime"]
        .to_numpy()
    )

    # Union-find
    parent = np.arange(
        len(df)
    )

    def find(value):

        while parent[value] != value:

            parent[value] = (
                parent[parent[value]]
            )

            value = parent[value]

        return value

    def union(first, second):

        root_first = find(first)
        root_second = find(second)

        if root_first != root_second:

            parent[root_second] = (
                root_first
            )

    # Connect detections
    for index, nearby_indices in enumerate(
        neighbors
    ):

        for nearby_index in nearby_indices:

            if index == nearby_index:
                continue

            time_gap_hours = abs(
                (
                    timestamps[index]
                    -
                    timestamps[nearby_index]
                )
                / np.timedelta64(1, "h")
            )

            if time_gap_hours <= temporal_hours:

                union(
                    index,
                    nearby_index
                )

    roots = [
        find(index)
        for index in range(len(df))
    ]

    root_to_source = {}

    source_ids = []

    for root in roots:

        if root not in root_to_source:

            number = (
                len(root_to_source)
                + 1
            )

            root_to_source[root] = (
                f"SOURCE_{number:04d}"
            )

        source_ids.append(
            root_to_source[root]
        )

    result = df.copy()

    result["source_id"] = source_ids

    return result


def main():

    Path(
        "data/processed"
    ).mkdir(
        parents=True,
        exist_ok=True
    )

    df = prepare_data(
        INPUT_PATH
    )

    clustered_df = create_clusters(
        df,
        spatial_km=SPATIAL_KM,
        temporal_hours=TEMPORAL_HOURS
    )

    clustered_df.to_csv(
        OUTPUT_PATH,
        index=False
    )

    print(
        f"Valid detections: {len(df)}"
    )

    print(
        f"Sources created: "
        f"{clustered_df['source_id'].nunique()}"
    )

    print(
        f"Saved: {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()