import enum
import uuid
from datetime import datetime, date

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class ExpenseCategory(str, enum.Enum):
    inventory = "inventory"
    transport = "transport"
    utilities = "utilities"
    equipment = "equipment"
    tithe = "tithe"
    salary = "salary"
    maintenance = "maintenance"
    damage_loss = "damage_loss"
    loan_repayment = "loan_repayment"
    miscellaneous = "miscellaneous"
    rent = "rent"
    marketing = "marketing"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(SAEnum(ExpenseCategory), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    expense_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
