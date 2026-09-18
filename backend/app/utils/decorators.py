from functools import wraps

from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

from app.models import User


def roles_required(*allowed_roles):
    """
    Restrict an endpoint to one or more roles, e.g.:

        @roles_required("officer", "admin")
        def some_view(): ...

    Must be used together with @jwt_required() is NOT needed separately —
    this decorator calls verify_jwt_in_request() itself.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role not in allowed_roles:
                return (
                    jsonify(
                        {
                            "error": "forbidden",
                            "message": f"This action requires one of these roles: {', '.join(allowed_roles)}.",
                        }
                    ),
                    403,
                )
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def get_current_user() -> "User | None":
    """Call inside a @jwt_required()-protected view to fetch the logged-in User row."""
    from flask_jwt_extended import get_jwt_identity

    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return User.query.get(int(user_id))
