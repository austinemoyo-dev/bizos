from datetime import date
from decimal import Decimal
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.cash_flow import CashEventType, FinanceScope
from models.expense import Expense, ExpenseCategory
from models.lending import DebtOwed, DebtPayment, LoanGiven, LoanRepayment
from models.personal import PersonalTransaction, PersonalTxType
from schemas.lending import (
    DebtOwedCreate,
    DebtPaymentCreate,
    LoanGivenCreate,
    LoanRepaymentCreate,
    LendingSummary,
)
from services.cash_flow_service import emit_cash_event


# ── Loans Given ──────────────────────────────────────────────────────────────

def create_loan_given(db: Session, payload: LoanGivenCreate) -> LoanGiven:
    given_at = payload.given_at or date.today()
    loan = LoanGiven(
        scope=payload.scope,
        borrower_name=payload.borrower_name,
        principal_amount=payload.principal_amount,
        due_date=payload.due_date,
        purpose=payload.purpose,
        given_at=given_at,
        notes=payload.notes,
    )
    db.add(loan)
    db.flush()  # get loan.id before emit

    # Cash leaves wallet — NOT an expense, does NOT affect P&L
    emit_cash_event(
        db,
        scope=payload.scope,
        event_type=CashEventType.loan_given,
        signed_amount=-payload.principal_amount,
        description=f"Loan given to {payload.borrower_name}",
        event_date=given_at,
        reference_id=loan.id,
        reference_type="loan_given",
    )

    db.commit()
    db.refresh(loan)
    return loan


def record_loan_repayment(db: Session, loan_id, payload: LoanRepaymentCreate) -> LoanRepayment:
    loan = db.query(LoanGiven).filter_by(id=loan_id).first()
    repaid_at = payload.repaid_at or date.today()

    repayment = LoanRepayment(
        loan_id=loan_id,
        amount=payload.amount,
        repaid_at=repaid_at,
        notes=payload.notes,
    )
    db.add(repayment)

    loan.amount_repaid += payload.amount
    if loan.amount_repaid >= loan.principal_amount:
        loan.is_settled = True

    db.flush()

    # Cash returns — NOT income, NO tithe triggered
    emit_cash_event(
        db,
        scope=loan.scope,
        event_type=CashEventType.loan_recovered,
        signed_amount=+payload.amount,
        description=f"Loan repayment from {loan.borrower_name}",
        event_date=repaid_at,
        reference_id=repayment.id,
        reference_type="loan_repayment",
    )

    db.commit()
    db.refresh(repayment)
    return repayment


# ── Debts Owed ───────────────────────────────────────────────────────────────

def create_debt_owed(db: Session, payload: DebtOwedCreate) -> DebtOwed:
    borrowed_at = payload.borrowed_at or date.today()
    debt = DebtOwed(
        scope=payload.scope,
        creditor_name=payload.creditor_name,
        principal_amount=payload.principal_amount,
        due_date=payload.due_date,
        purpose=payload.purpose,
        borrowed_at=borrowed_at,
        notes=payload.notes,
    )
    db.add(debt)
    db.flush()

    # Cash enters wallet — NOT income, NO tithe triggered
    emit_cash_event(
        db,
        scope=payload.scope,
        event_type=CashEventType.debt_received,
        signed_amount=+payload.principal_amount,
        description=f"Borrowed from {payload.creditor_name}",
        event_date=borrowed_at,
        reference_id=debt.id,
        reference_type="debt_owed",
    )

    db.commit()
    db.refresh(debt)
    return debt


def record_debt_payment(db: Session, debt_id, payload: DebtPaymentCreate) -> DebtPayment:
    debt = db.query(DebtOwed).filter_by(id=debt_id).first()
    paid_at = payload.paid_at or date.today()

    payment = DebtPayment(
        debt_id=debt_id,
        amount=payload.amount,
        paid_at=paid_at,
        notes=payload.notes,
    )
    db.add(payment)

    debt.amount_repaid += payload.amount
    if debt.amount_repaid >= debt.principal_amount:
        debt.is_settled = True

    db.flush()

    # Cash out — also record as expense depending on scope
    emit_cash_event(
        db,
        scope=debt.scope,
        event_type=CashEventType.debt_payment,
        signed_amount=-payload.amount,
        description=f"Debt repayment to {debt.creditor_name}",
        event_date=paid_at,
        reference_id=payment.id,
        reference_type="debt_payment",
    )

    if debt.scope == FinanceScope.business:
        expense = Expense(
            category=ExpenseCategory.loan_repayment,
            amount=payload.amount,
            description=f"Debt repayment to {debt.creditor_name}",
            reference_id=payment.id,
            expense_date=paid_at,
        )
        db.add(expense)
    else:
        tx = PersonalTransaction(
            type=PersonalTxType.expense,
            category="debt_repayment",
            amount=payload.amount,
            description=f"Debt repayment to {debt.creditor_name}",
            transaction_date=paid_at,
        )
        db.add(tx)

    db.commit()
    db.refresh(payment)
    return payment


# ── Summary ───────────────────────────────────────────────────────────────────

def get_lending_summary(db: Session, scope: FinanceScope) -> LendingSummary:
    today = date.today()

    total_lent = (
        db.query(func.sum(LoanGiven.principal_amount))
        .filter(LoanGiven.scope == scope)
        .scalar() or Decimal("0")
    )
    total_recovered = (
        db.query(func.sum(LoanGiven.amount_repaid))
        .filter(LoanGiven.scope == scope)
        .scalar() or Decimal("0")
    )
    overdue_loans = (
        db.query(func.count(LoanGiven.id))
        .filter(
            LoanGiven.scope == scope,
            LoanGiven.is_settled == False,
            LoanGiven.due_date != None,
            LoanGiven.due_date < today,
        )
        .scalar() or 0
    )

    total_borrowed = (
        db.query(func.sum(DebtOwed.principal_amount))
        .filter(DebtOwed.scope == scope)
        .scalar() or Decimal("0")
    )
    total_repaid = (
        db.query(func.sum(DebtOwed.amount_repaid))
        .filter(DebtOwed.scope == scope)
        .scalar() or Decimal("0")
    )
    overdue_debts = (
        db.query(func.count(DebtOwed.id))
        .filter(
            DebtOwed.scope == scope,
            DebtOwed.is_settled == False,
            DebtOwed.due_date != None,
            DebtOwed.due_date < today,
        )
        .scalar() or 0
    )

    return LendingSummary(
        scope=scope,
        total_lent_out=total_lent,
        total_recovered=total_recovered,
        outstanding_receivable=total_lent - total_recovered,
        overdue_loans=overdue_loans,
        total_borrowed=total_borrowed,
        total_repaid=total_repaid,
        outstanding_payable=total_borrowed - total_repaid,
        overdue_debts=overdue_debts,
    )
