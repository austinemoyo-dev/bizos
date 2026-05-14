"""Reset password for an existing user.

Usage:
    RESET_EMAIL=you@example.com RESET_PASSWORD=NewSecurePass1 python reset_password.py
    -- or run interactively and enter values at the prompts --
"""
import os
import sys

from core.database import SessionLocal
from core.security import hash_password
from models.user import User

email        = os.environ.get("RESET_EMAIL")    or input("User email: ").strip()
new_password = os.environ.get("RESET_PASSWORD") or input("New password: ").strip()

if len(new_password) < 8:
    print("Error: Password must be at least 8 characters")
    sys.exit(1)

db = SessionLocal()
try:
    user = db.query(User).filter_by(email=email).first()
    if not user:
        print(f"User not found: {email}")
        sys.exit(1)
    user.password_hash = hash_password(new_password)
    db.commit()
    print(f"Password reset successfully for {email}")
finally:
    db.close()
