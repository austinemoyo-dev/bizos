from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel


class SaleCreate(BaseModel):
    item_id: UUID4
    customer: Optional[str] = None
    quantity: int
    selling_price: Decimal
    sold_at: Optional[datetime] = None
    amount_paid: Optional[Decimal] = None


class SalePaymentUpdate(BaseModel):
    amount_paid: Decimal


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
