from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel

from models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    amount: Decimal
    description: Optional[str] = None
    reference_id: Optional[UUID4] = None
    expense_date: Optional[date] = None


class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None


class ExpenseOut(BaseModel):
    id: UUID4
    category: ExpenseCategory
    amount: Decimal
    description: Optional[str]
    reference_id: Optional[UUID4]
    expense_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseSummaryItem(BaseModel):
    category: str
    total: Decimal
    count: int
