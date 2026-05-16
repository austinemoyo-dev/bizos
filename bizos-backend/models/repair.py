import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SAEnum, ForeignKey,
    Integer, Numeric, Sequence, String, Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base


class DepositResolution(str, enum.Enum):
    refunded = "refunded"  # money returned to customer — excluded from balance
    kept     = "kept"      # kept as cancellation fee — stays in balance + counts as income


class RepairStatus(str, enum.Enum):
    received = "received"
    diagnosed = "diagnosed"
    in_progress = "in_progress"
    completed = "completed"
    delivered = "delivered"
    cancelled = "cancelled"


class DeviceType(str, enum.Enum):
    phone = "phone"
    tablet = "tablet"
    laptop = "laptop"
    computer = "computer"
    fan = "fan"
    extension = "extension"
    iron = "iron"
    washing_machine = "washing_machine"
    tv = "tv"
    gadget = "gadget"
    other = "other"


job_number_seq = Sequence("job_number_seq", start=1)


class RepairJob(Base):
    __tablename__ = "repair_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_number = Column(Integer, job_number_seq, server_default=job_number_seq.next_value(), unique=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    device_type = Column(SAEnum(DeviceType), nullable=False)
    device_model = Column(String, nullable=True)
    fault_description = Column(Text, nullable=True)
    labor_charge = Column(Numeric(12, 2), default=0)
    total_charge = Column(Numeric(12, 2), default=0)
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0)
    status = Column(SAEnum(RepairStatus), default=RepairStatus.received, nullable=False)
    received_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    cancel_reason = Column(Text, nullable=True)
    deposit_resolution = Column(SAEnum(DepositResolution), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    parts = relationship("JobPart", back_populates="job", cascade="all, delete-orphan")
    created_by_user = relationship("User")

    @property
    def balance(self) -> float:
        return float(self.total_charge - self.amount_paid)


class JobPart(Base):
    __tablename__ = "job_parts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("repair_jobs.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_cost = Column(Numeric(12, 2), nullable=False)  # purchase price snapshot
    selling_price = Column(Numeric(12, 2), nullable=True)  # charge-to-customer snapshot
    damaged = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    job = relationship("RepairJob", back_populates="parts")
    item = relationship("Item")

    @property
    def item_name(self) -> str | None:
        return self.item.name if self.item else None
