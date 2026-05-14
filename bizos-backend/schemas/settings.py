from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel, EmailStr, Field


class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    address: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[EmailStr] = None
    logo_url: Optional[str] = Field(None, max_length=500)


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
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)
    revenue_target: Decimal = Field(ge=Decimal("0"))
    profit_target: Decimal = Field(ge=Decimal("0"))


class MonthlyGoalUpdate(BaseModel):
    revenue_target: Optional[Decimal] = Field(None, ge=Decimal("0"))
    profit_target: Optional[Decimal] = Field(None, ge=Decimal("0"))


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
