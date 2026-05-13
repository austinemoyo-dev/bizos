from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import UUID4, BaseModel

from models.repair import DeviceType, RepairStatus


class JobPartCreate(BaseModel):
    item_id: UUID4
    quantity: int
    unit_cost: Decimal
    selling_price: Optional[Decimal] = None
    damaged: bool = False


class JobPartOut(BaseModel):
    id: UUID4
    item_id: UUID4
    quantity: int
    unit_cost: Decimal
    selling_price: Optional[Decimal] = None
    damaged: bool
    created_at: datetime
    item_name: Optional[str] = None

    class Config:
        from_attributes = True


class CancelJobRequest(BaseModel):
    cancel_reason: Optional[str] = None


class RepairPaymentUpdate(BaseModel):
    amount_paid: Decimal


class RepairJobCreate(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    device_type: DeviceType
    device_model: Optional[str] = None
    fault_description: Optional[str] = None
    labor_charge: Decimal = Decimal("0")
    total_charge: Decimal = Decimal("0")
    amount_paid: Optional[Decimal] = None
    notes: Optional[str] = None
    parts: Optional[List[JobPartCreate]] = []


class RepairJobUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    device_model: Optional[str] = None
    fault_description: Optional[str] = None
    labor_charge: Optional[Decimal] = None
    total_charge: Optional[Decimal] = None
    amount_paid: Optional[Decimal] = None
    notes: Optional[str] = None


class RepairStatusUpdate(BaseModel):
    status: RepairStatus


class RepairJobOut(BaseModel):
    id: UUID4
    job_number: int
    customer_name: str
    customer_phone: Optional[str]
    device_type: DeviceType
    device_model: Optional[str]
    fault_description: Optional[str]
    labor_charge: Decimal
    total_charge: Decimal
    amount_paid: Decimal
    status: RepairStatus
    received_at: datetime
    delivered_at: Optional[datetime]
    notes: Optional[str]
    cancel_reason: Optional[str] = None
    parts: List[JobPartOut] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Computed fields — not stored in DB
    parts_cost: Decimal = Decimal("0")
    profit: Decimal = Decimal("0")
    balance: Decimal = Decimal("0")

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_profit(cls, job) -> "RepairJobOut":
        parts_cost = sum(
            p.unit_cost * p.quantity for p in job.parts
        )
        profit = job.total_charge - parts_cost - job.labor_charge
        obj = cls.model_validate(job)
        obj.parts_cost = parts_cost
        obj.profit = profit
        obj.balance = job.balance
        return obj


class RepairProfitOut(BaseModel):
    revenue: Decimal
    parts_cost: Decimal
    labor_charge: Decimal
    total_expenses: Decimal
    profit: Decimal
    tithe_due: Decimal
    is_profitable: bool
