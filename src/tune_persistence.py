from pathlib import Path

import numpy as np
import pandas as pd


PERSISTENCE_PATH = (
    "data/processed/"
    "source_persistence_features.csv"
)

LABEL_PATH = (
    "data/processed/validation/"
    "persistence_labels.csv"
)

OUTPUT_PATH = (
    "data/validation/"
    "persistence_threshold_results.csv"
)


def calculate_metrics(
    y_true,
    y_pred
):

    tp = sum(
        actual == "persistent"
        and predicted == "persistent"
        for actual, predicted
        in zip(y_true, y_pred)
    )

    fp = sum(
        actual == "transient"
        and predicted == "persistent"
        for actual, predicted
        in zip(y_true, y_pred)
    )

    fn = sum(
        actual == "persistent"
        and predicted == "transient"
        for actual, predicted
        in zip(y_true, y_pred)
    )

    tn = sum(
        actual == "transient"
        and predicted == "transient"
        for actual, predicted
        in zip(y_true, y_pred)
    )

    precision = (
        tp / (tp + fp)
        if tp + fp > 0
        else 0
    )

    recall = (
        tp / (tp + fn)
        if tp + fn > 0
        else 0
    )

    if precision + recall > 0:

        f1 = (
            2
            * precision
            * recall
            /
            (precision + recall)
        )

    else:

        f1 = 0

    accuracy = (
        (tp + tn)
        /
        (tp + tn + fp + fn)
        if tp + tn + fp + fn > 0
        else 0
    )

    return (
        accuracy,
        precision,
        recall,
        f1
    )


def main():

    Path(
        "data/validation"
    ).mkdir(
        parents=True,
        exist_ok=True
    )

    persistence = pd.read_csv(
        PERSISTENCE_PATH
    )

    labels = pd.read_csv(
        LABEL_PATH
    )

    required_columns = [
        "source_id",
        "label"
    ]

    missing = [
        column
        for column in required_columns
        if column not in labels.columns
    ]

    if missing:

        raise ValueError(
            f"Missing label columns: "
            f"{missing}"
        )

    labels["label"] = (
        labels["label"]
        .str.lower()
        .str.strip()
    )

    valid_labels = [
        "persistent",
        "transient"
    ]

    invalid = labels[
        ~labels["label"].isin(
            valid_labels
        )
    ]

    if not invalid.empty:

        raise ValueError(
            "Labels must be "
            "'persistent' or 'transient'."
        )

    df = persistence.merge(
        labels,
        on="source_id",
        how="inner"
    )

    if df.empty:

        raise ValueError(
            "No matching source_id values "
            "between persistence output "
            "and validation labels."
        )

    print(
        f"Validation sources: {len(df)}"
    )

    results = []

    for threshold in np.arange(
        0.10,
        0.91,
        0.01
    ):

        predictions = np.where(
            df["persistence_score"]
            >= threshold,
            "persistent",
            "transient"
        )

        (
            accuracy,
            precision,
            recall,
            f1
        ) = calculate_metrics(
            df["label"].tolist(),
            predictions.tolist()
        )

        results.append({

            "threshold":
                round(
                    float(threshold),
                    2
                ),

            "accuracy":
                accuracy,

            "precision":
                precision,

            "recall":
                recall,

            "f1":
                f1
        })

    results_df = pd.DataFrame(
        results
    )

    results_df.to_csv(
        OUTPUT_PATH,
        index=False
    )

    best = (
        results_df
        .sort_values(
            [
                "f1",
                "recall"
            ],
            ascending=False
        )
        .iloc[0]
    )

    print(
        "\nBEST THRESHOLD"
    )

    print(
        f"Threshold: "
        f"{best['threshold']:.2f}"
    )

    print(
        f"Accuracy: "
        f"{best['accuracy']:.3f}"
    )

    print(
        f"Precision: "
        f"{best['precision']:.3f}"
    )

    print(
        f"Recall: "
        f"{best['recall']:.3f}"
    )

    print(
        f"F1: "
        f"{best['f1']:.3f}"
    )

    print(
        f"\nSaved: {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()