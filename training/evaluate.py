"""
Evaluates a trained model on the held-out test split (never seen during
training) and reports real, computed metrics: accuracy, precision,
recall, F1-score, and a confusion matrix. Nothing here is invented —
every number comes directly from running the model on test.csv.

Usage (run from the training/ folder, after train.py has completed):

    python evaluate.py --model ../backend/models/civic_classifier.keras

Outputs:
    - ./results/metrics.json
    - ./results/confusion_matrix.png
    - ./results/classification_report.txt
"""
import os
import argparse
import json

import numpy as np
import tensorflow as tf
import matplotlib

matplotlib.use("Agg")  # no display needed — just saves a PNG
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
)

from dataset_utils import CLASSES, load_splits, make_dataset


def plot_confusion_matrix(cm, class_names, output_path):
    fig, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(cm, cmap="Greens")
    ax.set_xticks(range(len(class_names)))
    ax.set_yticks(range(len(class_names)))
    ax.set_xticklabels(class_names, rotation=45, ha="right")
    ax.set_yticklabels(class_names)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Confusion Matrix — SwachhSeva Civic Classifier")

    for i in range(len(class_names)):
        for j in range(len(class_names)):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center", fontsize=10)

    fig.colorbar(im, ax=ax)
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description="Evaluate a trained SwachhSeva classifier.")
    parser.add_argument("--model", default="../backend/models/civic_classifier.keras")
    parser.add_argument("--splits-dir", default="./splits")
    parser.add_argument("--results-dir", default="./results")
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    if not os.path.exists(args.model):
        raise FileNotFoundError(
            f"No model found at {args.model}. Run train.py first — evaluate.py never "
            f"invents a model or fake results."
        )

    print(f"Loading model from {args.model} ...")
    model = tf.keras.models.load_model(args.model)

    print(f"Loading test split from {args.splits_dir} ...")
    _, _, test_df = load_splits(args.splits_dir)
    print(f"Test set: {len(test_df)} images")

    test_ds = make_dataset(test_df, batch_size=args.batch_size, augment=False, shuffle=False)

    print("Running predictions on the test set...")
    y_true = test_df["label"].values
    y_pred_probs = model.predict(test_ds, verbose=0)
    y_pred = np.argmax(y_pred_probs, axis=1)

    accuracy = accuracy_score(y_true, y_pred)
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(CLASSES))))
    report = classification_report(y_true, y_pred, target_names=CLASSES, zero_division=0)

    os.makedirs(args.results_dir, exist_ok=True)

    metrics = {
        "test_set_size": len(test_df),
        "accuracy": float(accuracy),
        "precision_macro": float(precision_macro),
        "recall_macro": float(recall_macro),
        "f1_macro": float(f1_macro),
        "precision_weighted": float(precision_weighted),
        "recall_weighted": float(recall_weighted),
        "f1_weighted": float(f1_weighted),
        "confusion_matrix": cm.tolist(),
        "classes": CLASSES,
    }

    with open(os.path.join(args.results_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    with open(os.path.join(args.results_dir, "classification_report.txt"), "w") as f:
        f.write(report)

    plot_confusion_matrix(cm, CLASSES, os.path.join(args.results_dir, "confusion_matrix.png"))

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS (computed from your actual test set)")
    print("=" * 60)
    print(f"Test set size:        {len(test_df)} images")
    print(f"Accuracy:             {accuracy:.4f}")
    print(f"Precision (macro):    {precision_macro:.4f}")
    print(f"Recall (macro):       {recall_macro:.4f}")
    print(f"F1-score (macro):     {f1_macro:.4f}")
    print("\nPer-class report:")
    print(report)
    print(f"\nFull results saved to {args.results_dir}/")
    print("=" * 60)


if __name__ == "__main__":
    main()
