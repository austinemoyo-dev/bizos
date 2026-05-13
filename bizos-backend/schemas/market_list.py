from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import UUID4, BaseModel


class MarketListItemCreate(BaseModel):
    item_name: str
    inventory_item_id: Optional[UUID4] = None
    quantity_needed: int = 1
    estimated_cost: Optional[Decimal] = None


class MarketListItemOut(BaseModel):
    id: UUID4
    item_name: str
    inventory_item_id: Optional[UUID4]
    quantity_needed: int
    estimated_cost: Optional[Decimal]
    purchased: bool
    purchased_at: Optional[datetime]

    class Config:
        from_attributes = True


class MarketListCreate(BaseModel):
    name: str


class MarketListOut(BaseModel):
    id: UUID4
    name: str
    is_active: bool
    created_at: datetime
    items: List[MarketListItemOut] = []

    class Config:
        from_attributes = True
