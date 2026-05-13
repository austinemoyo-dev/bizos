from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel

from models.tithe import TitheScope


class TitheRecordOut(BaseModel):
    id: UUID4
    scope: TitheScope
    calculated_from: Decimal
    tithe_amount: Decimal
    paid: bool
    paid_at: Optional[datetime]
    expense_id: Optional[UUID4]
    period_start: Optional[date]
    period_end: Optional[date]
    reference_id: Optional[UUID4]
    created_at: datetime

    class Config:
        from_attributes = True


class TitheUnpaidTotal(BaseModel):
    scope: TitheScope
    total: Decimal
