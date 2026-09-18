import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class Config:
    """Central configuration, read entirely from environment variables."""

    SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or (
        "sqlite:///" + os.path.join(BASE_DIR, "instance", "swachhseva.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    UPLOAD_FOLDER = os.path.join(BASE_DIR, os.environ.get("UPLOAD_FOLDER", "uploads"))
    RESOLUTION_UPLOAD_FOLDER = os.path.join(
        BASE_DIR, os.environ.get("RESOLUTION_UPLOAD_FOLDER", "uploads/resolutions")
    )

    AI_MODEL_PATH = os.path.join(
        BASE_DIR, os.environ.get("AI_MODEL_PATH", "models/civic_classifier.keras")
    )

    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_UPLOAD_MB", 8)) * 1024 * 1024
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg"}

    AI_CONFIDENCE_THRESHOLD = 0.60

    ISSUE_CLASSES = [
        "pothole",
        "garbage_dump",
        "broken_streetlight",
        "blocked_drain",
        "damaged_footpath",
    ]

    # issue_type -> (department name, SLA in days)
    DEPARTMENT_ROUTING = {
        "pothole": ("Roads & Infrastructure", 5),
        "garbage_dump": ("Solid Waste Management", 2),
        "broken_streetlight": ("Electrical Department", 3),
        "blocked_drain": ("Drainage & Sewerage", 3),
        "damaged_footpath": ("Civil Works Division", 7),
    }
