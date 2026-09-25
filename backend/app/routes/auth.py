import re

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from app.extensions import db
from app.models import User, VALID_ROLES

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip() or None
    password = data.get("password") or ""
    role = data.get("role", "citizen")

    if not name or not email or not password:
        return jsonify({"error": "validation_error", "message": "name, email and password are required."}), 400

    if not EMAIL_RE.match(email):
        return jsonify({"error": "validation_error", "message": "Invalid email format."}), 400

    if len(password) < 8:
        return jsonify({"error": "validation_error", "message": "Password must be at least 8 characters."}), 400

    # Citizens self-register as "citizen" only. Officer/admin accounts are
    # created by an existing admin through the admin dashboard, not this
    # public endpoint, to prevent anyone granting themselves privileges.
    if role not in ("citizen",):
        role = "citizen"

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "conflict", "message": "An account with this email already exists."}), 409

    user = User(name=name, email=email, phone=phone, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "validation_error", "message": "email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    current_app.logger.warning(
        "LOGIN DEBUG: email=%r found_user=%s stored_hash=%r input_password=%r check_result=%s",
         email,
         user is not None,
         user.password_hash if user else None,
         password,
         user.check_password(password) if user else None,
    )
    if user is None or not user.check_password(password):
        return jsonify({"error": "invalid_credentials", "message": "Incorrect email or password."}), 401

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if user is None:
        return jsonify({"error": "not_found", "message": "User not found."}), 404
    return jsonify(user.to_dict()), 200
