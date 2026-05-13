from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel

from models.inventory import MovementType


class ItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    sku: Optional[str] = None
    purchase_price: Decimal
    selling_price: Optional[Decimal] = None
    quantity_in_stock: int = 0
    reorder_level: int = 5
    supplier: Optional[str] = None
    notes: Optional[str] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    purchase_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    reorder_level: Optional[int] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None


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
    quantity: int
    unit_cost: Decimal


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
