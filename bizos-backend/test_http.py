import requests

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.sales import Sale
from models.user import User
from core.security import create_access_token

db = SessionLocal()
sale = db.query(Sale).first()
user = db.query(User).first()
db.close()

if not sale:
    print("No sales in DB")
else:
    print(f"Testing HTTP PATCH for sale {sale.id}")
    
    # Use proper user ID for token
    token = create_access_token(data={"sub": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.patch(
        f"http://localhost:8000/api/v1/sales/{sale.id}/payment",
        json={"amount_paid": 150},
        headers=headers
    )
    print("Status:", response.status_code)
    print("Body:", response.text)
