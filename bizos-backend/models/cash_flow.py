import enum
import uuid
from datetime import datetime, date

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class FinanceScope(str, enum.Enum):
    business = "business"
    personal = "personal"


class CashEventType(str, enum.Enum):
    opening_balance = "opening_balance"
    revenue = "revenue"               # sale or repair payment received
    expense = "expense"               # expense paid
    loan_given = "loan_given"         # money lent out — cash OUT, NOT expense, NO P&L impact
    loan_recovered = "loan_recovered" # repayment received — cash IN, NOT income, NO tithe
    debt_received = "debt_received"   # money borrowed — cash IN, NOT income, NO tithe
    debt_payment = "debt_payment"     # repaying a debt — cash OUT (also creates Expense for biz)
    adjustment = "adjustment"         # manual correction


class CashBalance(Base):
    """One row per scope. Stores the opening balance; current balance is computed."""
    __tablename__ = "cash_balances"
    __table_args__ = (UniqueConstraint("scope", name="uq_cash_balance_scope"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(SAEnum(FinanceScope), nullable=False)
    opening_balance = Column(Numeric(12, 2), nullable=False, default=0)
    opened_at = Column(Date, default=date.today, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class CashEvent(Base):
    """Every money movement since the opening balance was set.
    signed_amount: positive = cash in, negative = cash out."""
    __tablename__ = "cash_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(SAEnum(FinanceScope), nullable=False)
    event_type = Column(SAEnum(CashEventType), nullable=False)
    signed_amount = Column(Numeric(12, 2), nullable=False)  # +in / -out
    description = Column(Text, nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)   # links to source record
    reference_type = Column(String(50), nullable=True)          # "sale", "expense", "loan_given", etc.
    event_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
