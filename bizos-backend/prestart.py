"""
Pre-start script: run before alembic and gunicorn.

On a FRESH database:
  - create_all() builds the full schema from current ORM models
  - alembic is stamped at head so it skips migrations (already applied by create_all)

On an EXISTING database:
  - create_all() is a no-op (skips tables/types that already exist)
  - alembic upgrade head runs any new migrations added since last deploy

First admin user:
  - If INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_NAME / INITIAL_ADMIN_PASSWORD are set
    AND no users exist yet, the super_admin is created automatically.
  - Once any user exists these env vars are ignored, so they are safe to leave set.
"""
import os
import subprocess
import sys

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.database import Base, engine
from core.security import hash_password
import models  # noqa: F401 — registers all ORM models on Base.metadata


def _seed_initial_admin(session: Session) -> None:
    from models.user import User, UserRole

    email    = os.environ.get("INITIAL_ADMIN_EMAIL", "").strip()
    name     = os.environ.get("INITIAL_ADMIN_NAME", "").strip()
    password = os.environ.get("INITIAL_ADMIN_PASSWORD", "").strip()

    if not (email and name and password):
        return  # env vars not set — nothing to do

    existing = session.query(User).first()
    if existing:
        return  # users already exist — skip silently

    admin = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=UserRole.super_admin,
        is_active=True,
    )
    session.add(admin)
    session.commit()
    print(f"    Initial admin created: {email}")


def main() -> None:
    print("==> Creating schema from ORM models (create_all is idempotent)...")
    Base.metadata.create_all(bind=engine)
    print("    Schema ready.")

    print("==> Checking alembic version table...")
    with engine.connect() as conn:
        try:
            rows = list(conn.execute(text("SELECT version_num FROM alembic_version")))
            is_stamped = len(rows) > 0
        except Exception:
            is_stamped = False

    if is_stamped:
        print("    Existing database — alembic upgrade head will apply any new migrations.")
    else:
        print("    Fresh database — stamping alembic at head (create_all already built the schema).")
        subprocess.run([sys.executable, "-m", "alembic", "stamp", "head"], check=True)
        print("    Stamped.")

    print("==> Checking for initial admin seed...")
    with Session(engine) as session:
        _seed_initial_admin(session)


if __name__ == "__main__":
    main()
