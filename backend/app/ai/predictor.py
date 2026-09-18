"""
Loads the trained MobileNetV2 civic-issue classifier if it exists.

IMPORTANT — honesty rule:
If no trained model file is present at AI_MODEL_PATH, this module NEVER
invents a fake prediction. Instead every prediction request returns
demo_mode=True with predicted_class=None, and the complaint is routed to
PENDING_REVIEW so a human officer classifies it manually. This matches the
project rule: never pretend a demo output is a real AI result.

Once you train a real model (see training/train.py) and place the .keras
file at AI_MODEL_PATH, this module automatically switches to real
predictions on the next backend restart — no code changes needed.
"""
import os
import threading

import numpy as np
from flask import current_app

_model = None
_model_lock = threading.Lock()
_load_attempted = False


def _try_load_model(model_path: str):
    global _model, _load_attempted
    with _model_lock:
        if _load_attempted:
            return _model
        _load_attempted = True

        if not os.path.exists(model_path):
            _model = None
            return None

        try:
            # Imported lazily so the backend can run in demo mode even on
            # machines where TensorFlow isn't installed yet.
            import tensorflow as tf

            _model = tf.keras.models.load_model(model_path)
        except Exception as exc:  # noqa: BLE001 - we want to degrade to demo mode on ANY load failure
            current_app.logger.warning(
                "Could not load AI model at %s (%s). Falling back to Demo Mode.",
                model_path,
                exc,
            )
            _model = None
        return _model


def is_model_loaded() -> bool:
    model_path = current_app.config["AI_MODEL_PATH"]
    return _try_load_model(model_path) is not None


def predict(image_absolute_path: str) -> dict:
    """
    Returns one of:

    Real model loaded:
        {
          "demo_mode": False,
          "predicted_class": "pothole",
          "confidence": 0.91,
          "probabilities": {"pothole": 0.91, "garbage_dump": 0.03, ...}
        }

    No model file found (or it failed to load):
        {
          "demo_mode": True,
          "predicted_class": None,
          "confidence": None,
          "probabilities": None
        }
    """
    model_path = current_app.config["AI_MODEL_PATH"]
    model = _try_load_model(model_path)

    if model is None:
        return {
            "demo_mode": True,
            "predicted_class": None,
            "confidence": None,
            "probabilities": None,
        }

    from tensorflow.keras.preprocessing import image as keras_image

    classes = current_app.config["ISSUE_CLASSES"]

    img = keras_image.load_img(image_absolute_path, target_size=(224, 224))
    arr = keras_image.img_to_array(img)
    arr = arr / 255.0
    arr = np.expand_dims(arr, axis=0)

    raw_output = model.predict(arr, verbose=0)[0]
    probabilities = {cls: float(raw_output[i]) for i, cls in enumerate(classes)}

    best_idx = int(np.argmax(raw_output))
    predicted_class = classes[best_idx]
    confidence = float(raw_output[best_idx])

    return {
        "demo_mode": False,
        "predicted_class": predicted_class,
        "confidence": confidence,
        "probabilities": probabilities,
    }
