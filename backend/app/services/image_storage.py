"""
Persistent image storage via Cloudinary.

Render's free tier wipes the local disk on every deploy/restart, so any
photo saved only under UPLOAD_FOLDER eventually disappears. Every image is
therefore also mirrored to Cloudinary under a public_id derived from its
relative path, e.g. "resolutions/ab12.jpeg" -> "swachhseva/resolutions/ab12".

The database keeps storing the same relative path as before, so no schema
or frontend change is needed: the /uploads/<path> route serves the local
copy while it exists and otherwise redirects to the Cloudinary copy.

If CLOUDINARY_URL is not set (e.g. local development), everything falls
back to local-disk-only behaviour.
"""
import os

from flask import current_app

CLOUDINARY_ROOT_FOLDER = "swachhseva"


def is_enabled() -> bool:
    return bool(os.environ.get("CLOUDINARY_URL"))


def _public_id(relative_path: str) -> str:
    base, _ext = os.path.splitext(relative_path.replace("\\", "/"))
    return f"{CLOUDINARY_ROOT_FOLDER}/{base}"


def upload(absolute_path: str, relative_path: str) -> bool:
    """Mirrors a locally saved image to Cloudinary. Never raises: a failed
    upload is logged, and the complaint is still accepted using the local copy."""
    if not is_enabled():
        return False

    import cloudinary.uploader

    try:
        cloudinary.uploader.upload(
            absolute_path,
            public_id=_public_id(relative_path),
            overwrite=True,
            resource_type="image",
        )
        return True
    except Exception as exc:  # noqa: BLE001 - never fail a submission over mirroring
        current_app.logger.error("Cloudinary upload failed for %s: %s", relative_path, exc)
        return False


def public_url(relative_path: str):
    """Returns the Cloudinary HTTPS URL for a stored image, or None if
    Cloudinary isn't configured."""
    if not is_enabled():
        return None

    import cloudinary.utils

    url, _options = cloudinary.utils.cloudinary_url(
        _public_id(relative_path), format="jpg", secure=True, resource_type="image"
    )
    return url