from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel, Field

from models.inventory import MovementType


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    purchase_price: Decimal = Field(ge=Decimal("0"))
    selling_price: Optional[Decimal] = Field(None, gt=Decimal("0"))
    quantity_in_stock: int = Field(0, ge=0)
    reorder_level: int = Field(5, ge=0)
    supplier: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=1000)
    purchase_date: Optional[date] = None  # backdatable for initial inventory records


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    purchase_price: Optional[Decimal] = Field(None, ge=Decimal("0"))
    selling_price: Optional[Decimal] = Field(None, gt=Decimal("0"))
    reorder_level: Optional[int] = Field(None, ge=0)
    supplier: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=1000)


class ItemOut(BaseModel):
    id: UUID4
    name: str
    category: Optional[str]
    sku: Optional[str]
    purchase_price: Decimal
    selling_price: Optional[Decimal]
    quantity_in_stock: int
    reorder_level: int
    supplier: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RestockRequest(BaseModel):
    quantity: int = Field(ge=1)
    unit_cost: Decimal = Field(gt=Decimal("0"))
    restock_date: Optional[date] = None  # backdatable for historical restock records


class StockMovementOut(BaseModel):
    id: UUID4
    item_id: UUID4
    movement_type: MovementType
    quantity: int
    unit_cost: Optional[Decimal]
    reference_id: Optional[UUID4]
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
