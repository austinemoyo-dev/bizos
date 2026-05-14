"""
Pre-start script: run before alembic and gunicorn.

On a FRESH database:
  - create_all() builds the full schema from current ORM models
  - alembic is stamped at head so it skips migrations (already applied by create_all)

On an EXISTING database:
  - create_all() is a no-op (skips tables/types that already exist)
  - alembic upgrade head runs any new migrations added since last deploy
"""
import subprocess
import sys

from sqlalchemy import text

from core.database import Base, engine
import models  # noqa: F401 — registers all ORM models on Base.metadata


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


if __name__ == "__main__":
    main()
