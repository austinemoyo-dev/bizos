from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import UUID4, BaseModel, Field

from models.repair import DeviceType, DepositResolution, RepairStatus


class JobPartCreate(BaseModel):
    item_id: UUID4
    quantity: int = Field(ge=1)
    unit_cost: Decimal = Field(ge=Decimal("0"))
    selling_price: Optional[Decimal] = Field(None, ge=Decimal("0"))
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
    cancel_reason: Optional[str] = Field(None, max_length=500)


class ResolveDepositRequest(BaseModel):
    resolution: DepositResolution


class RepairPaymentUpdate(BaseModel):
    amount_paid: Decimal = Field(ge=Decimal("0"))


class RepairJobCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=20)
    device_type: DeviceType
    device_model: Optional[str] = Field(None, max_length=100)
    fault_description: Optional[str] = Field(None, max_length=1000)
    labor_charge: Decimal = Field(Decimal("0"), ge=Decimal("0"))
    total_charge: Decimal = Field(Decimal("0"), ge=Decimal("0"))
    amount_paid: Optional[Decimal] = Field(None, ge=Decimal("0"))
    status: Optional[RepairStatus] = RepairStatus.received
    notes: Optional[str] = Field(None, max_length=1000)
    parts: Optional[List[JobPartCreate]] = []
    received_at: Optional[date] = None
    completed_at: Optional[date] = None


class RepairJobUpdate(BaseModel):
    customer_name: Optional[str] = Field(None, min_length=1, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=20)
    device_model: Optional[str] = Field(None, max_length=100)
    fault_description: Optional[str] = Field(None, max_length=1000)
    labor_charge: Optional[Decimal] = Field(None, ge=Decimal("0"))
    total_charge: Optional[Decimal] = Field(None, ge=Decimal("0"))
    amount_paid: Optional[Decimal] = Field(None, ge=Decimal("0"))
    notes: Optional[str] = Field(None, max_length=1000)
    completed_at: Optional[date] = None  # allow backdating for historical records


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
    completed_at: Optional[datetime] = None
    delivered_at: Optional[datetime]
    notes: Optional[str]
    cancel_reason: Optional[str] = None
    deposit_resolution: Optional[DepositResolution] = None
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
        # Damaged parts are already booked as damage_loss Expenses on the ledger.
        # Including them here as COGS would double-count against profit.
        parts_cost = sum(p.unit_cost * p.quantity for p in job.parts if not p.damaged)
        profit = job.total_charge - parts_cost
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
