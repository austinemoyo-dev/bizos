from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import UUID4, BaseModel, Field


class FoodCreditCreate(BaseModel):
    vendor_name: str = Field(min_length=1, max_length=200)
    meal_description: Optional[str] = Field(None, max_length=500)
    amount: Decimal = Field(gt=Decimal("0"))
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
    credit_ids: List[UUID4] = Field(min_length=1)
    vendor_name: str = Field(min_length=1, max_length=200)


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
    monthly_total: Decimal
    daily_average: Decimal
    total_outstanding: Decimal
    total_paid: Decimal
    total_credits: int
    unpaid_count: int


class FoodTrendPoint(BaseModel):
    date: str
    total: Decimal
    count: int


class VendorSpendingSummary(BaseModel):
    vendor_name: str
    total_spent: Decimal
    total_meals: int
    unpaid_amount: Decimal


class FoodMonthSummary(BaseModel):
    month: str          # "YYYY-MM"
    total_spent: Decimal
    total_paid: Decimal
    total_credits: int
    payment_count: int
