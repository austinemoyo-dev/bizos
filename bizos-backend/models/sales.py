import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    customer = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    selling_price = Column(Numeric(12, 2), nullable=False)   # per unit
    cost_price = Column(Numeric(12, 2), nullable=False)      # snapshot
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0)
    # profit = (selling_price - cost_price) * quantity — NEVER store, always compute
    sold_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    item = relationship("Item")

    @property
    def balance(self) -> float:
        return float((self.selling_price * self.quantity) - self.amount_paid)
