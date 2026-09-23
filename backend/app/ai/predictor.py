"""
Loads the trained MobileNetV2 civic-issue classifier (TensorFlow Lite
version) if it exists.

IMPORTANT — honesty rule:
If no trained model file is present at AI_MODEL_PATH, this module NEVER
invents a fake prediction. Instead every prediction request returns
demo_mode=True with predicted_class=None, and the complaint is routed to
PENDING_REVIEW so a human officer classifies it manually. This matches the
project rule: never pretend a demo output is a real AI result.

Once you place the .tflite file at AI_MODEL_PATH, this module automatically
switches to real predictions on the next backend restart — no code changes
needed.

Uses tflite-runtime instead of full TensorFlow — dramatically lighter on
memory, which matters on low-RAM hosting (e.g. Render's free tier).
"""
import os
import threading

import numpy as np
from PIL import Image
from flask import current_app

_interpreter = None
_input_details = None
_output_details = None
_model_lock = threading.Lock()
_load_attempted = False


def _try_load_model(model_path: str):
    global _interpreter, _input_details, _output_details, _load_attempted
    with _model_lock:
        if _load_attempted:
            return _interpreter
        _load_attempted = True

        if not os.path.exists(model_path):
            _interpreter = None
            return None

        try:
            # Imported lazily so the backend can run in demo mode even on
            # machines where tflite-runtime isn't installed yet.
            try:
                from ai_edge_litert.interpreter import Interpreter
            except ImportError:
                from tensorflow.lite.python.interpreter import Interpreter

            interpreter = Interpreter(model_path=model_path)
            interpreter.allocate_tensors()

            _input_details = interpreter.get_input_details()
            _output_details = interpreter.get_output_details()
            _interpreter = interpreter
        except Exception as exc:  # noqa: BLE001 - we want to degrade to demo mode on ANY load failure
            current_app.logger.warning(
                "Could not load AI model at %s (%s). Falling back to Demo Mode.",
                model_path,
                exc,
            )
            _interpreter = None
        return _interpreter


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
    interpreter = _try_load_model(model_path)

    if interpreter is None:
        return {
            "demo_mode": True,
            "predicted_class": None,
            "confidence": None,
            "probabilities": None,
        }

    classes = current_app.config["ISSUE_CLASSES"]

    img = Image.open(image_absolute_path).convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)

    input_index = _input_details[0]["index"]
    output_index = _output_details[0]["index"]

    interpreter.set_tensor(input_index, arr)
    interpreter.invoke()
    raw_output = interpreter.get_tensor(output_index)[0]

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