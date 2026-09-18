"""
Shared dataset utilities for train.py and evaluate.py.

IMPORTANT: CLASSES here must exactly match app/config.py's ISSUE_CLASSES
list in the backend, in the same order — the backend indexes the model's
raw softmax output by position, not by name. Do not reorder this list
without also updating the backend config.
"""
import os
import json
import random

import numpy as np
import pandas as pd
import tensorflow as tf

CLASSES = [
    "pothole",
    "garbage_dump",
    "broken_streetlight",
    "blocked_drain",
    "damaged_footpath",
]

IMAGE_SIZE = (224, 224)
VALID_EXTENSIONS = (".jpg", ".jpeg", ".png")


def collect_filepaths(dataset_dir):
    """
    Walks dataset_dir/<class_name>/*.jpg and returns a DataFrame with
    columns [filepath, label, class_name]. Raises a clear error if a
    class folder is missing or empty, rather than silently training on
    fewer classes than expected.
    """
    rows = []
    for class_name in CLASSES:
        class_dir = os.path.join(dataset_dir, class_name)
        if not os.path.isdir(class_dir):
            raise FileNotFoundError(
                f"Expected a folder at {class_dir} but it doesn't exist. "
                f"Create one subfolder per class under {dataset_dir}: {', '.join(CLASSES)}"
            )
        files = [
            f for f in os.listdir(class_dir) if f.lower().endswith(VALID_EXTENSIONS)
        ]
        if len(files) == 0:
            raise ValueError(
                f"No images found in {class_dir}. Add some .jpg/.jpeg/.png files "
                f"before training — see training/README.md for dataset prep guidance."
            )
        for f in files:
            rows.append(
                {
                    "filepath": os.path.join(class_dir, f),
                    "label": CLASSES.index(class_name),
                    "class_name": class_name,
                }
            )
    return pd.DataFrame(rows)


def stratified_split(df, val_frac=0.15, test_frac=0.15, seed=42):
    """
    Splits each class independently so train/val/test all contain a
    proportional share of every class (stratified), not just a random
    global split that could leave a class missing from the test set.
    """
    rng = random.Random(seed)
    train_rows, val_rows, test_rows = [], [], []

    for class_name in CLASSES:
        class_rows = df[df["class_name"] == class_name].to_dict("records")
        rng.shuffle(class_rows)
        n = len(class_rows)
        n_val = max(1, int(n * val_frac)) if n >= 5 else max(0, n // 5)
        n_test = max(1, int(n * test_frac)) if n >= 5 else max(0, n // 5)
        n_train = n - n_val - n_test
        if n_train < 1:
            raise ValueError(
                f"Class '{class_name}' only has {n} image(s) — too few to split into "
                f"train/val/test. Add more images (aim for at least 20-30 per class)."
            )
        train_rows.extend(class_rows[:n_train])
        val_rows.extend(class_rows[n_train : n_train + n_val])
        test_rows.extend(class_rows[n_train + n_val :])

    return (
        pd.DataFrame(train_rows).reset_index(drop=True),
        pd.DataFrame(val_rows).reset_index(drop=True),
        pd.DataFrame(test_rows).reset_index(drop=True),
    )


def save_splits(train_df, val_df, test_df, splits_dir):
    os.makedirs(splits_dir, exist_ok=True)
    train_df.to_csv(os.path.join(splits_dir, "train.csv"), index=False)
    val_df.to_csv(os.path.join(splits_dir, "val.csv"), index=False)
    test_df.to_csv(os.path.join(splits_dir, "test.csv"), index=False)


def load_splits(splits_dir):
    train_df = pd.read_csv(os.path.join(splits_dir, "train.csv"))
    val_df = pd.read_csv(os.path.join(splits_dir, "val.csv"))
    test_df = pd.read_csv(os.path.join(splits_dir, "test.csv"))
    return train_df, val_df, test_df


def _load_and_preprocess(filepath, label, augment):
    image = tf.io.read_file(filepath)
    image = tf.image.decode_image(image, channels=3, expand_animations=False)
    image.set_shape([None, None, 3])
    image = tf.image.resize(image, IMAGE_SIZE)

    if augment:
        image = tf.image.random_flip_left_right(image)
        image = tf.image.random_brightness(image, max_delta=0.15)
        image = tf.image.random_contrast(image, lower=0.85, upper=1.15)

    image = image / 255.0
    label = tf.one_hot(label, depth=len(CLASSES))
    return image, label


def make_dataset(df, batch_size=32, augment=False, shuffle=False):
    filepaths = df["filepath"].values
    labels = df["label"].values.astype(np.int32)

    ds = tf.data.Dataset.from_tensor_slices((filepaths, labels))
    if shuffle:
        ds = ds.shuffle(buffer_size=len(df), seed=42, reshuffle_each_iteration=True)

    ds = ds.map(
        lambda fp, lb: _load_and_preprocess(fp, lb, augment),
        num_parallel_calls=tf.data.AUTOTUNE,
    )
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds


def save_class_index_map(output_path):
    """
    Documents the class order actually used, so anyone reviewing the
    project (or debugging a mismatch) can see it explicitly rather than
    having to infer it from code.
    """
    mapping = {i: name for i, name in enumerate(CLASSES)}
    with open(output_path, "w") as f:
        json.dump(mapping, f, indent=2)
