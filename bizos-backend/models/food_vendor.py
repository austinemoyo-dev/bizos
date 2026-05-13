import uuid
from datetime import datetime, date

from sqlalchemy import Boolean, Column, Date, DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class FoodVendorCredit(Base):
    __tablename__ = "food_vendor_credits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_name = Column(String, nullable=False)
    meal_description = Column(String, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    purchase_date = Column(Date, default=date.today, nullable=False)
    paid = Column(Boolean, default=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payment_batch_id = Column(UUID(as_uuid=True), nullable=True)  # group payments by batch
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class FoodVendorPayment(Base):
    __tablename__ = "food_vendor_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_name = Column(String, nullable=False)
    amount_paid = Column(Numeric(12, 2), nullable=False)
    paid_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    note = Column(Text, nullable=True)
