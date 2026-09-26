import os
import uuid

from flask import current_app
from PIL import Image, UnidentifiedImageError


def allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]


def save_image(file_storage, subfolder: str = "") -> str:
    """
    Validates that the uploaded file is really a readable image (not just a
    file with an image-like extension), saves it under UPLOAD_FOLDER, and
    returns the relative path that should be stored in the database.

    Raises ValueError with a human-readable message on any validation failure.
    """
    if file_storage is None or file_storage.filename == "":
        raise ValueError("No image file was provided.")

    if not allowed_file(file_storage.filename):
        allowed = ", ".join(current_app.config["ALLOWED_IMAGE_EXTENSIONS"])
        raise ValueError(f"Unsupported file type. Allowed types: {allowed}.")

    ext = file_storage.filename.rsplit(".", 1)[1].lower()
    safe_name = f"{uuid.uuid4().hex}.{ext}"

    target_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], subfolder)
    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, safe_name)

    file_storage.save(target_path)

    # Verify it's actually a valid image, and re-save it re-encoded so any
    # malformed / oversized image gets normalized instead of stored raw.
    try:
        with Image.open(target_path) as img:
            img.verify()
        with Image.open(target_path) as img:
            img = img.convert("RGB")
            img.thumbnail((1600, 1600))
            img.save(target_path, quality=85, optimize=True)
    except (UnidentifiedImageError, OSError) as exc:
        os.remove(target_path)
        raise ValueError("The uploaded file is not a valid image.") from exc

    relative_path = os.path.join(subfolder, safe_name) if subfolder else safe_name
    relative_path = relative_path.replace("\\", "/")

    # Mirror to persistent storage so the photo survives Render redeploys.
    # Imported here to avoid a circular import at module load time.
    from app.services import image_storage

    image_storage.upload(target_path, relative_path)
    return relative_path
