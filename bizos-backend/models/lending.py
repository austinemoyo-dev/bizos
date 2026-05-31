import uuid
from datetime import datetime, date

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from core.database import Base
from models.cash_flow import FinanceScope
from sqlalchemy import Enum as SAEnum


class LoanGiven(Base):
    """Money lent out to someone. Cash leaves wallet but is NOT an expense.
    Repayments come back as cash IN but are NOT income — no tithe triggered."""
    __tablename__ = "loans_given"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(SAEnum(FinanceScope), nullable=False)
    borrower_name = Column(String, nullable=False)
    principal_amount = Column(Numeric(12, 2), nullable=False)
    amount_repaid = Column(Numeric(12, 2), nullable=False, default=0)
    due_date = Column(Date, nullable=True)
    purpose = Column(Text, nullable=True)
    is_settled = Column(Boolean, default=False)
    given_at = Column(Date, default=date.today, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    repayments = relationship("LoanRepayment", back_populates="loan", cascade="all, delete-orphan")

    @property
    def outstanding(self):
        return float(self.principal_amount - self.amount_repaid)


class LoanRepayment(Base):
    """A repayment received on a loan given. Creates a CashEvent(+) but NOT income."""
    __tablename__ = "loan_repayments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    loan_id = Column(UUID(as_uuid=True), ForeignKey("loans_given.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    repaid_at = Column(Date, default=date.today, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    loan = relationship("LoanGiven", back_populates="repayments")


class DebtOwed(Base):
    """Money borrowed from someone. Cash enters wallet but is NOT income.
    Repayments are cash OUT — also recorded as Expense (business) or PersonalTransaction (personal)."""
    __tablename__ = "debts_owed"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(SAEnum(FinanceScope), nullable=False)
    creditor_name = Column(String, nullable=False)
    principal_amount = Column(Numeric(12, 2), nullable=False)
    amount_repaid = Column(Numeric(12, 2), nullable=False, default=0)
    due_date = Column(Date, nullable=True)
    purpose = Column(Text, nullable=True)
    is_settled = Column(Boolean, default=False)
    borrowed_at = Column(Date, default=date.today, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    payments = relationship("DebtPayment", back_populates="debt", cascade="all, delete-orphan")

    @property
    def outstanding(self):
        return float(self.principal_amount - self.amount_repaid)


class DebtPayment(Base):
    """A payment made toward a debt. Cash OUT + Expense (biz) or PersonalTransaction (personal)."""
    __tablename__ = "debt_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    debt_id = Column(UUID(as_uuid=True), ForeignKey("debts_owed.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    paid_at = Column(Date, default=date.today, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    debt = relationship("DebtOwed", back_populates="payments")
