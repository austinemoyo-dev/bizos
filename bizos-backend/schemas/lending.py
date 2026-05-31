from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import UUID4, BaseModel, Field

from models.cash_flow import FinanceScope


# ── Loans Given ──────────────────────────────────────────────────────────────

class LoanGivenCreate(BaseModel):
    scope: FinanceScope
    borrower_name: str = Field(min_length=1, max_length=200)
    principal_amount: Decimal = Field(gt=Decimal("0"))
    due_date: Optional[date] = None
    purpose: Optional[str] = Field(None, max_length=500)
    given_at: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)


class LoanGivenUpdate(BaseModel):
    borrower_name: Optional[str] = Field(None, min_length=1, max_length=200)
    due_date: Optional[date] = None
    purpose: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=500)


class LoanRepaymentCreate(BaseModel):
    amount: Decimal = Field(gt=Decimal("0"))
    repaid_at: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)


class LoanRepaymentOut(BaseModel):
    id: UUID4
    loan_id: UUID4
    amount: Decimal
    repaid_at: date
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LoanGivenOut(BaseModel):
    id: UUID4
    scope: FinanceScope
    borrower_name: str
    principal_amount: Decimal
    amount_repaid: Decimal
    outstanding: Decimal
    due_date: Optional[date]
    purpose: Optional[str]
    is_settled: bool
    given_at: date
    notes: Optional[str]
    created_at: datetime
    repayments: List[LoanRepaymentOut] = []

    class Config:
        from_attributes = True


# ── Debts Owed ───────────────────────────────────────────────────────────────

class DebtOwedCreate(BaseModel):
    scope: FinanceScope
    creditor_name: str = Field(min_length=1, max_length=200)
    principal_amount: Decimal = Field(gt=Decimal("0"))
    due_date: Optional[date] = None
    purpose: Optional[str] = Field(None, max_length=500)
    borrowed_at: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)


class DebtOwedUpdate(BaseModel):
    creditor_name: Optional[str] = Field(None, min_length=1, max_length=200)
    due_date: Optional[date] = None
    purpose: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=500)


class DebtPaymentCreate(BaseModel):
    amount: Decimal = Field(gt=Decimal("0"))
    paid_at: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)


class DebtPaymentOut(BaseModel):
    id: UUID4
    debt_id: UUID4
    amount: Decimal
    paid_at: date
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DebtOwedOut(BaseModel):
    id: UUID4
    scope: FinanceScope
    creditor_name: str
    principal_amount: Decimal
    amount_repaid: Decimal
    outstanding: Decimal
    due_date: Optional[date]
    purpose: Optional[str]
    is_settled: bool
    borrowed_at: date
    notes: Optional[str]
    created_at: datetime
    payments: List[DebtPaymentOut] = []

    class Config:
        from_attributes = True


# ── Summary ───────────────────────────────────────────────────────────────────

class LendingSummary(BaseModel):
    scope: FinanceScope
    total_lent_out: Decimal         # sum of all principals for loans given
    total_recovered: Decimal        # sum of all repayments received
    outstanding_receivable: Decimal # still owed to you
    overdue_loans: int              # loans past due_date and not settled

    total_borrowed: Decimal         # sum of all principals for debts owed
    total_repaid: Decimal           # sum of all payments made
    outstanding_payable: Decimal    # you still owe
    overdue_debts: int              # debts past due_date and not settled
