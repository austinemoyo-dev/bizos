from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import UUID4, BaseModel


class FoodCreditCreate(BaseModel):
    vendor_name: str
    meal_description: Optional[str] = None
    amount: Decimal
    purchase_date: Optional[date] = None


class FoodCreditOut(BaseModel):
    id: UUID4
    vendor_name: str
    meal_description: Optional[str]
    amount: Decimal
    purchase_date: date
    paid: bool
    paid_at: Optional[datetime]
    payment_batch_id: Optional[UUID4]
    created_at: datetime

    class Config:
        from_attributes = True


class FoodVendorPayRequest(BaseModel):
    credit_ids: List[UUID4]
    vendor_name: str


class FoodVendorPaymentOut(BaseModel):
    id: UUID4
    vendor_name: str
    amount_paid: Decimal
    paid_at: datetime
    note: Optional[str]

    class Config:
        from_attributes = True


class VendorOutstanding(BaseModel):
    vendor_name: str
    total_outstanding: Decimal
    credit_count: int


class FoodVendorAnalytics(BaseModel):
    weekly_total: Decimal
    daily_average: Decimal
    total_outstanding: Decimal
