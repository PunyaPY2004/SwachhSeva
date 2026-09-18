import os

from app import create_app
from app.extensions import db

app = create_app()


@app.cli.command("init-db")
def init_db():
    """Run with: flask --app run init-db"""
    with app.app_context():
        db.create_all()
        print("Database tables created.")


@app.cli.command("create-admin")
def create_admin():
    """
    Creates (or resets) an admin account. Run with:
        flask --app run create-admin
    Then follow the prompts. Officer/admin accounts are intentionally NOT
    created through the public /api/auth/register endpoint.
    """
    from app.models import User

    with app.app_context():
        email = input("Admin email: ").strip().lower()
        name = input("Admin name: ").strip()
        password = input("Admin password (min 8 chars): ").strip()

        user = User.query.filter_by(email=email).first()
        if user is None:
            user = User(name=name, email=email, role="admin")
        else:
            user.name = name
            user.role = "admin"
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"Admin account ready: {email}")


@app.cli.command("migrate-v2")
def migrate_v2():
    """
    Upgrades an existing database (created before the duplicate-detection
    / upvoting feature) to add the new column and table, WITHOUT losing
    your existing users or complaints. Run once with:
        flask --app run migrate-v2
    Safe to run multiple times — it checks before adding anything.
    """
    from sqlalchemy import text, inspect

    with app.app_context():
        inspector = inspect(db.engine)
        existing_columns = [col["name"] for col in inspector.get_columns("complaints")]

        if "upvote_count" not in existing_columns:
            db.session.execute(
                text("ALTER TABLE complaints ADD COLUMN upvote_count INTEGER DEFAULT 1")
            )
            db.session.commit()
            print("Added 'upvote_count' column to complaints table.")
        else:
            print("'upvote_count' column already exists — skipping.")

        # create_all() only creates tables that don't exist yet (like the
        # new complaint_upvotes table) — it never alters existing tables.
        db.create_all()
        print("Ensured complaint_upvotes table exists.")
        print("Migration complete.")


@app.cli.command("migrate-v3")
def migrate_v3():
    """
    Upgrades an existing database to add the citizen-dispute/reopen
    feature's columns, WITHOUT losing any existing data. Run once with:
        flask --app run migrate-v3
    Safe to run multiple times.
    """
    from sqlalchemy import text, inspect

    with app.app_context():
        inspector = inspect(db.engine)
        existing_columns = [col["name"] for col in inspector.get_columns("complaints")]

        additions = [
            ("dispute_reason", "TEXT"),
            ("disputed_at", "DATETIME"),
            ("dispute_count", "INTEGER DEFAULT 0"),
        ]
        for col_name, col_type in additions:
            if col_name not in existing_columns:
                db.session.execute(text(f"ALTER TABLE complaints ADD COLUMN {col_name} {col_type}"))
                db.session.commit()
                print(f"Added '{col_name}' column to complaints table.")
            else:
                print(f"'{col_name}' column already exists — skipping.")

        print("Migration complete.")
        print("Ensured complaint_upvotes table exists.")
        print("Migration complete.")


@app.cli.command("create-officer")
def create_officer():
    """
    Creates (or updates) an officer account scoped to one department.
    Run with:
        flask --app run create-officer
    """
    from app.models import User

    with app.app_context():
        email = input("Officer email: ").strip().lower()
        name = input("Officer name: ").strip()
        password = input("Officer password (min 8 chars): ").strip()
        print("Departments: Roads & Infrastructure, Solid Waste Management, "
              "Electrical Department, Drainage & Sewerage, Civil Works Division")
        department = input("Department (exact name from list above): ").strip()

        user = User.query.filter_by(email=email).first()
        if user is None:
            user = User(name=name, email=email, role="officer", department=department)
        else:
            user.name = name
            user.role = "officer"
            user.department = department
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"Officer account ready: {email} ({department})")


if __name__ == "__main__":
    debug = os.environ.get("FLASK_ENV", "development") == "development"
    # use_reloader=False keeps this predictable when run from scripts/CI;
    # remove it locally if you want Flask's auto-reload-on-save behavior.
    app.run(host="0.0.0.0", port=5000, debug=debug, use_reloader=False)
