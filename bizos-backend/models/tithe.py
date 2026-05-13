import enum
import uuid
from datetime import datetime, date

from sqlalchemy import Boolean, Column, Date, DateTime, Enum as SAEnum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class TitheScope(str, enum.Enum):
    business = "business"
    personal = "personal"


class TitheRecord(Base):
    __tablename__ = "tithe_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(SAEnum(TitheScope), nullable=False)
    calculated_from = Column(Numeric(12, 2), nullable=False)  # profit or income
    tithe_amount = Column(Numeric(12, 2), nullable=False)      # always 10% of calculated_from
    paid = Column(Boolean, default=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=True)  # set when paid
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # job_id that triggered it
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
