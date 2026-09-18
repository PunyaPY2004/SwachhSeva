"""
Single shared instances of Flask extensions.

Kept in their own module (instead of inside app/__init__.py) so that
models, routes, and services can all `from app.extensions import db`
without causing circular imports.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
