import os
import sys

# Add the project root to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.sales import Sale
from models.repair import RepairJob, JobPart
from models.expense import Expense
from models.tithe import TitheRecord
from models.inventory import StockMovement, Item
from models.personal import PersonalTransaction

db = SessionLocal()
try:
    print("Deleting Sales...")
    db.query(Sale).delete()
    print("Deleting Job Parts...")
    db.query(JobPart).delete()
    print("Deleting Repair Jobs...")
    db.query(RepairJob).delete()
    print("Deleting Tithe Records...")
    db.query(TitheRecord).delete()
    print("Deleting Expenses...")
    db.query(Expense).delete()
    print("Deleting Stock Movements...")
    db.query(StockMovement).delete()
    print("Deleting Personal Transactions...")
    db.query(PersonalTransaction).delete()
    print("Deleting Items...")
    db.query(Item).delete()
    
    db.commit()
    print("All transaction and inventory data cleared successfully.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
