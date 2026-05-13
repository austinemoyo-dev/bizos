"""Reset password for an existing user."""
from core.database import SessionLocal
from core.security import hash_password
from models.user import User

email = "augustineakinmoyo@gmail.com"
new_password = "akinmoyo"

db = SessionLocal()
try:
    user = db.query(User).filter_by(email=email).first()
    if not user:
        print(f"User not found: {email}")
    else:
        user.password_hash = hash_password(new_password)
        db.commit()
        print(f"Password reset successfully for {email}")
finally:
    db.close()
