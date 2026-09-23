"""
One-time script: converts the trained Keras model to a much smaller,
memory-efficient TensorFlow Lite model for deployment on low-RAM hosts.

Run this locally (where you already have full TensorFlow installed).
Output: backend/models/civic_classifier.tflite
"""
import tensorflow as tf

KERAS_MODEL_PATH = "models/civic_classifier.keras"
TFLITE_MODEL_PATH = "models/civic_classifier.tflite"

print(f"Loading Keras model from {KERAS_MODEL_PATH} ...")
model = tf.keras.models.load_model(KERAS_MODEL_PATH)

print("Converting to TensorFlow Lite ...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)

# Optional but recommended: reduces model size further via quantization
converter.optimizations = [tf.lite.Optimize.DEFAULT]

tflite_model = converter.convert()

with open(TFLITE_MODEL_PATH, "wb") as f:
    f.write(tflite_model)

print(f"Done! Saved TFLite model to {TFLITE_MODEL_PATH}")