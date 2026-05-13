from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel

from models.personal import PersonalTxType


class PersonalTransactionCreate(BaseModel):
    type: PersonalTxType
    category: str
    amount: Decimal
    description: Optional[str] = None
    transaction_date: Optional[date] = None


class PersonalTransactionOut(BaseModel):
    id: UUID4
    type: PersonalTxType
    category: str
    amount: Decimal
    description: Optional[str]
    transaction_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class PersonalSummary(BaseModel):
    period_start: date
    period_end: date
    total_income: Decimal
    total_expenses: Decimal
    balance: Decimal


class SavingsGoalCreate(BaseModel):
    name: str
    target_amount: Decimal
    target_date: Optional[date] = None


class SavingsGoalUpdate(BaseModel):
    current_amount: Optional[Decimal] = None
    target_amount: Optional[Decimal] = None
    target_date: Optional[date] = None


class SavingsGoalOut(BaseModel):
    id: UUID4
    name: str
    target_amount: Decimal
    current_amount: Decimal
    target_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True
