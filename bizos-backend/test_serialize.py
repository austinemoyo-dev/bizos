import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.sales import Sale
from schemas.sales import SaleOut

db = SessionLocal()
try:
    sale = db.query(Sale).first()
    if sale:
        print("Serializing Sale...")
        try:
            out = SaleOut.from_orm(sale)
            print("Success:", out)
        except Exception as e:
            print("Serialization Error:", e)
finally:
    db.close()
