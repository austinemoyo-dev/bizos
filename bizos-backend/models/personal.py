import enum
import uuid
from datetime import datetime, date

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class PersonalTxType(str, enum.Enum):
    income = "income"
    expense = "expense"
    savings = "savings"


class PersonalIncomeCategory(str, enum.Enum):
    salary = "salary"
    side_income = "side_income"
    gift = "gift"
    other = "other"


class PersonalExpenseCategory(str, enum.Enum):
    food = "food"
    transport = "transport"
    data = "data"
    airtime = "airtime"
    bills = "bills"
    savings = "savings"
    tithe = "tithe"
    debt_repayment = "debt_repayment"
    miscellaneous = "miscellaneous"


class PersonalTransaction(Base):
    __tablename__ = "personal_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(SAEnum(PersonalTxType), nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    transaction_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), default=0)
    target_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
