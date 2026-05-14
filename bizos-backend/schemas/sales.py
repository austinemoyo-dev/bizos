from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel, Field


class SaleCreate(BaseModel):
    item_id: UUID4
    customer: Optional[str] = Field(None, max_length=100)
    quantity: int = Field(ge=1)
    selling_price: Decimal = Field(gt=Decimal("0"))
    sold_at: Optional[datetime] = None
    amount_paid: Optional[Decimal] = Field(None, ge=Decimal("0"))


class SalePaymentUpdate(BaseModel):
    amount_paid: Decimal = Field(ge=Decimal("0"))


class SaleOut(BaseModel):
    id: UUID4
    item_id: UUID4
    customer: Optional[str]
    quantity: int
    selling_price: Decimal
    cost_price: Decimal
    amount_paid: Decimal
    sold_at: datetime
    balance: Decimal

    class Config:
        from_attributes = True
