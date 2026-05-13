from core.database import SessionLocal
from models.sales import Sale
from models.repair import RepairJob
from models.expense import Expense
from sqlalchemy import func

db = SessionLocal()

sales_sum = db.query(func.sum(Sale.amount_paid)).scalar() or 0
repairs_sum = db.query(func.sum(RepairJob.amount_paid)).scalar() or 0
expenses_sum = db.query(func.sum(Expense.amount)).scalar() or 0

print(f"Sales Income: {sales_sum}")
print(f"Repairs Income: {repairs_sum}")
print(f"Total Expenses (incl. inventory): {expenses_sum}")
print("--- Expense Breakdown ---")
expenses = db.query(Expense).all()
for e in expenses:
    print(f"- {e.category}: {e.amount} ({e.description})")

print(f"Money Available calculation: ({sales_sum} + {repairs_sum}) - {expenses_sum} = {(sales_sum + repairs_sum) - expenses_sum}")

db.close()
