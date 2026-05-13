import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class MarketList(Base):
    __tablename__ = "market_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    items = relationship("MarketListItem", back_populates="list", cascade="all, delete-orphan")


class MarketListItem(Base):
    __tablename__ = "market_list_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    list_id = Column(UUID(as_uuid=True), ForeignKey("market_lists.id", ondelete="CASCADE"))
    item_name = Column(String, nullable=False)
    inventory_item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=True)
    quantity_needed = Column(Integer, default=1)
    estimated_cost = Column(Numeric(12, 2), nullable=True)
    purchased = Column(Boolean, default=False)
    purchased_at = Column(DateTime(timezone=True), nullable=True)

    list = relationship("MarketList", back_populates="items")
    inventory_item = relationship("Item")
