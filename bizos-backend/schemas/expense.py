from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel, Field

from models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    amount: Decimal = Field(gt=Decimal("0"))
    description: Optional[str] = Field(None, max_length=500)
    reference_id: Optional[UUID4] = None
    expense_date: Optional[date] = None


class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    amount: Optional[Decimal] = Field(None, gt=Decimal("0"))
    description: Optional[str] = Field(None, max_length=500)
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
