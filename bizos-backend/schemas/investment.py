from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel

from models.investment import InvestmentType


class InvestmentCreate(BaseModel):
    party_name: str
    type: InvestmentType
    amount: Decimal
    expected_return: Optional[Decimal] = None
    due_date: Optional[date] = None
    purpose: Optional[str] = None


class InvestmentUpdate(BaseModel):
    party_name: Optional[str] = None
    expected_return: Optional[Decimal] = None
    due_date: Optional[date] = None
    purpose: Optional[str] = None


class RepaymentRequest(BaseModel):
    amount: Decimal


class InvestmentOut(BaseModel):
    id: UUID4
    party_name: str
    type: InvestmentType
    amount: Decimal
    expected_return: Optional[Decimal]
    amount_repaid: Decimal
    balance_outstanding: Decimal
    due_date: Optional[date]
    purpose: Optional[str]
    is_settled: bool
    received_at: date
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "party_name": obj.party_name,
            "type": obj.type,
            "amount": obj.amount,
            "expected_return": obj.expected_return,
            "amount_repaid": obj.amount_repaid,
            "balance_outstanding": obj.amount - obj.amount_repaid,
            "due_date": obj.due_date,
            "purpose": obj.purpose,
            "is_settled": obj.is_settled,
            "received_at": obj.received_at,
            "created_at": obj.created_at,
        }
        return cls(**data)
