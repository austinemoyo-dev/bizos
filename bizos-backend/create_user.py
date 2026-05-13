"""Run this once to create the first admin user."""
import sys
from core.database import SessionLocal
from core.security import hash_password
from models.user import User, UserRole

email = "augustineakinmoyo@gmail.com"
password = "akinmoyo"   # change this to whatever you want
name = "Augustine"

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
    print(f"  Email:    {email}")
    print(f"  Password: {password}")
    print(f"  Role:     super_admin")
finally:
    db.close()
