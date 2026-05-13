import enum
import uuid
from datetime import datetime, date

from sqlalchemy import Boolean, Column, Date, DateTime, Enum as SAEnum, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class InvestmentType(str, enum.Enum):
    loan = "loan"
    investment = "investment"


class Investment(Base):
    __tablename__ = "investments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    party_name = Column(String, nullable=False)
    type = Column(SAEnum(InvestmentType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    expected_return = Column(Numeric(12, 2), nullable=True)
    amount_repaid = Column(Numeric(12, 2), default=0)
    due_date = Column(Date, nullable=True)
    purpose = Column(Text, nullable=True)
    is_settled = Column(Boolean, default=False)
    received_at = Column(Date, default=date.today)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Computed property (in service layer): balance_outstanding = amount - amount_repaid
