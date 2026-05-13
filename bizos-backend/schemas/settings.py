from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel


class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None


class BusinessProfileOut(BaseModel):
    id: UUID4
    name: str
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    logo_url: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


class MonthlyGoalCreate(BaseModel):
    month: int
    year: int
    revenue_target: Decimal
    profit_target: Decimal


class MonthlyGoalUpdate(BaseModel):
    revenue_target: Optional[Decimal] = None
    profit_target: Optional[Decimal] = None


class MonthlyGoalOut(BaseModel):
    id: UUID4
    month: int
    year: int
    revenue_target: Decimal
    profit_target: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
