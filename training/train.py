"""
Trains the SwachhSeva civic-issue classifier using transfer learning on
MobileNetV2, per the architecture specified in the project brief:

    Input Image -> MobileNetV2 (frozen) -> GlobalAveragePooling2D
    -> Dense(128, relu) -> Dropout -> Dense(5, softmax)

Usage (run from the training/ folder):

    python train.py --dataset ./dataset --epochs 15 --fine-tune-epochs 5

Outputs:
    - ../backend/models/civic_classifier.keras   (the trained model — the
      backend picks this up automatically on its next restart)
    - ./splits/{train,val,test}.csv              (the exact split used,
      so evaluate.py scores on the same held-out test set)
    - ./results/class_index_map.json
    - ./results/training_history.json            (real per-epoch metrics)

This script does not fabricate results. Whatever accuracy/loss numbers
appear are computed from your actual dataset and actual training run —
if you have very few images, expect correspondingly weak numbers, which
is expected and fine for a college-project demo model.
"""
import os
import argparse
import json

import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models, optimizers, callbacks

from dataset_utils import (
    CLASSES,
    IMAGE_SIZE,
    collect_filepaths,
    stratified_split,
    save_splits,
    make_dataset,
    save_class_index_map,
)


def build_model(num_classes, base_trainable=False):
    base = MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
        pooling=None,
    )
    base.trainable = base_trainable

    inputs = layers.Input(shape=(*IMAGE_SIZE, 3))
    x = base(inputs, training=base_trainable)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs)
    return model, base


def main():
    parser = argparse.ArgumentParser(description="Train the SwachhSeva civic-issue classifier.")
    parser.add_argument("--dataset", default="./dataset", help="Path to dataset/<class>/*.jpg folders")
    parser.add_argument("--epochs", type=int, default=15, help="Epochs to train with the base frozen")
    parser.add_argument(
        "--fine-tune-epochs",
        type=int,
        default=5,
        help="Additional epochs fine-tuning the top of MobileNetV2 (0 to skip fine-tuning)",
    )
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument(
        "--output",
        default="../backend/models/civic_classifier.keras",
        help="Where to save the trained model (backend loads it from here automatically)",
    )
    parser.add_argument("--splits-dir", default="./splits")
    parser.add_argument("--results-dir", default="./results")
    args = parser.parse_args()

    print(f"Loading dataset from {args.dataset} ...")
    df = collect_filepaths(args.dataset)
    print(f"Found {len(df)} images across {len(CLASSES)} classes:")
    print(df["class_name"].value_counts())

    train_df, val_df, test_df = stratified_split(df)
    save_splits(train_df, val_df, test_df, args.splits_dir)
    print(f"Split: {len(train_df)} train / {len(val_df)} val / {len(test_df)} test")

    os.makedirs(args.results_dir, exist_ok=True)
    save_class_index_map(os.path.join(args.results_dir, "class_index_map.json"))

    train_ds = make_dataset(train_df, batch_size=args.batch_size, augment=True, shuffle=True)
    val_ds = make_dataset(val_df, batch_size=args.batch_size, augment=False, shuffle=False)

    print("\nBuilding model (MobileNetV2, base frozen)...")
    model, base = build_model(num_classes=len(CLASSES), base_trainable=False)
    model.compile(
        optimizer=optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    cb = [
        callbacks.EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2),
    ]

    print(f"\nTraining for up to {args.epochs} epochs (base frozen)...")
    history1 = model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=cb)

    full_history = {k: [float(v) for v in vals] for k, vals in history1.history.items()}

    if args.fine_tune_epochs > 0:
        print(f"\nUnfreezing top layers of MobileNetV2 for fine-tuning ({args.fine_tune_epochs} epochs)...")
        base.trainable = True
        # Keep early layers frozen — only fine-tune the later, more
        # task-specific layers. Freezing everything before layer 100
        # (out of ~155 in MobileNetV2) is a common, safe default.
        for layer in base.layers[:100]:
            layer.trainable = False

        model.compile(
            optimizer=optimizers.Adam(learning_rate=1e-5),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )
        history2 = model.fit(
            train_ds, validation_data=val_ds, epochs=args.fine_tune_epochs, callbacks=cb
        )
        for k, vals in history2.history.items():
            full_history.setdefault(k, [])
            full_history[k].extend(float(v) for v in vals)

    model.save(args.output)
    print(f"\nModel saved to {args.output}")

    with open(os.path.join(args.results_dir, "training_history.json"), "w") as f:
        json.dump(full_history, f, indent=2)

    final_val_acc = full_history["val_accuracy"][-1]
    final_val_loss = full_history["val_loss"][-1]
    print(f"\nFinal validation accuracy: {final_val_acc:.4f}")
    print(f"Final validation loss: {final_val_loss:.4f}")
    print("\nRun evaluate.py next to score this model on the held-out test set.")


if __name__ == "__main__":
    main()
