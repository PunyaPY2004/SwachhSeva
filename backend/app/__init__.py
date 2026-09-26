import os

from flask import Flask, jsonify, send_from_directory, abort, redirect
from flask_cors import CORS
from dotenv import load_dotenv

from app.config import Config
from app.extensions import db, jwt, migrate

load_dotenv()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["RESOLUTION_UPLOAD_FOLDER"], exist_ok=True)

    db_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    if db_uri.startswith("sqlite:///"):
        sqlite_path = db_uri.replace("sqlite:///", "", 1)
        sqlite_dir = os.path.dirname(sqlite_path)
        if sqlite_dir:
            os.makedirs(sqlite_dir, exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    from app.routes.auth import auth_bp
    from app.routes.complaints import complaints_bp
    from app.routes.admin import admin_bp
    from app.routes.leaderboard import leaderboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(complaints_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(leaderboard_bp)

    @app.get("/api/health")
    def health():
        from app.ai import predictor
        with app.app_context():
            model_loaded = predictor.is_model_loaded()
        return jsonify({"status": "ok", "ai_model_loaded": model_loaded}), 200

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        # Serves complaint photos and resolution photos so the mobile app
        # and admin dashboard can display them by relative path.
        # Uploaded civic-complaint photos aren't private citizen data, so
        # this is intentionally unauthenticated for simplicity in this
        # college project; add @jwt_required() here if you want to lock it down.
        #
        # IMPORTANT: don't run this through os.path.normpath() — on Windows
        # that rewrites forward slashes to backslashes, which breaks
        # Werkzeug's internal path handling and causes a false 404 for any
        # file inside a subfolder (like resolutions/xxx.jpg). Check for
        # path-traversal attempts directly on the URL-style path instead.
        parts = filename.split("/")
        if ".." in parts:
            abort(404)

        # Serve the local copy while it exists (fast, and the only option
        # in local development without Cloudinary).
        local_path = os.path.join(app.config["UPLOAD_FOLDER"], *parts)
        if os.path.isfile(local_path):
            return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

        # Render's free tier wipes local disk on every redeploy/restart —
        # fall back to the persistent Cloudinary copy.
        from app.services import image_storage

        cloud_url = image_storage.public_url(filename)
        if cloud_url:
            return redirect(cloud_url, code=302)

        abort(404)

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({"error": "file_too_large", "message": "Uploaded file exceeds the maximum allowed size."}), 413

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": "not_found", "message": "Resource not found."}), 404

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({"error": "server_error", "message": "An unexpected error occurred."}), 500

    return app
