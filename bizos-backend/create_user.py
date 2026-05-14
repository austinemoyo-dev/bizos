"""Run this once to create the first admin user.

Usage:
    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=SecurePass1 ADMIN_NAME=YourName python create_user.py
    -- or run interactively and enter values at the prompts --
"""
import os
import sys

from core.database import SessionLocal
from core.security import hash_password
from models.user import User, UserRole

email    = os.environ.get("ADMIN_EMAIL")    or input("Admin email: ").strip()
password = os.environ.get("ADMIN_PASSWORD") or input("Admin password: ").strip()
name     = os.environ.get("ADMIN_NAME")     or input("Admin name: ").strip()

if len(password) < 8:
    print("Error: Password must be at least 8 characters")
    sys.exit(1)

db = SessionLocal()
try:
    existing = db.query(User).filter_by(email=email).first()
    if existing:
        print(f"User already exists: {email}")
        sys.exit(0)

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=UserRole.super_admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    print(f"Success! User created:")
    print(f"  Email:  {email}")
    print(f"  Role:   super_admin")
finally:
    db.close()
