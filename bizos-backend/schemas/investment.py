from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel, Field

from models.investment import InvestmentType


class InvestmentCreate(BaseModel):
    party_name: str = Field(min_length=1, max_length=200)
    type: InvestmentType
    amount: Decimal = Field(gt=Decimal("0"))
    expected_return: Optional[Decimal] = Field(None, ge=Decimal("0"))
    due_date: Optional[date] = None
    purpose: Optional[str] = Field(None, max_length=500)


class InvestmentUpdate(BaseModel):
    party_name: Optional[str] = Field(None, min_length=1, max_length=200)
    expected_return: Optional[Decimal] = Field(None, ge=Decimal("0"))
    due_date: Optional[date] = None
    purpose: Optional[str] = Field(None, max_length=500)


class RepaymentRequest(BaseModel):
    amount: Decimal = Field(gt=Decimal("0"))


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
        return cls(
            id=obj.id,
            party_name=obj.party_name,
            type=obj.type,
            amount=obj.amount,
            expected_return=obj.expected_return,
            amount_repaid=obj.amount_repaid,
            balance_outstanding=obj.amount - obj.amount_repaid,
            due_date=obj.due_date,
            purpose=obj.purpose,
            is_settled=obj.is_settled,
            received_at=obj.received_at,
            created_at=obj.created_at,
        )
