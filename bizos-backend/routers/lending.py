from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.cash_flow import FinanceScope
from models.lending import DebtOwed, LoanGiven
from models.user import User, UserRole
from schemas.lending import (
    DebtOwedCreate,
    DebtOwedOut,
    DebtOwedUpdate,
    DebtPaymentCreate,
    DebtPaymentOut,
    LendingSummary,
    LoanGivenCreate,
    LoanGivenOut,
    LoanGivenUpdate,
    LoanRepaymentCreate,
    LoanRepaymentOut,
)
from services.lending_service import (
    create_debt_owed,
    create_loan_given,
    get_lending_summary,
    record_debt_payment,
    record_loan_repayment,
)

router = APIRouter()

OWNER_ROLES = (UserRole.owner, UserRole.super_admin)


def _loan_out(loan: LoanGiven) -> LoanGivenOut:
    return LoanGivenOut(
        id=loan.id,
        scope=loan.scope,
        borrower_name=loan.borrower_name,
        principal_amount=loan.principal_amount,
        amount_repaid=loan.amount_repaid,
        outstanding=loan.outstanding,
        due_date=loan.due_date,
        purpose=loan.purpose,
        is_settled=loan.is_settled,
        given_at=loan.given_at,
        notes=loan.notes,
        created_at=loan.created_at,
        repayments=[LoanRepaymentOut.from_orm(r) for r in loan.repayments],
    )


def _debt_out(debt: DebtOwed) -> DebtOwedOut:
    return DebtOwedOut(
        id=debt.id,
        scope=debt.scope,
        creditor_name=debt.creditor_name,
        principal_amount=debt.principal_amount,
        amount_repaid=debt.amount_repaid,
        outstanding=debt.outstanding,
        due_date=debt.due_date,
        purpose=debt.purpose,
        is_settled=debt.is_settled,
        borrowed_at=debt.borrowed_at,
        notes=debt.notes,
        created_at=debt.created_at,
        payments=[DebtPaymentOut.from_orm(p) for p in debt.payments],
    )


# ── Loans Given ───────────────────────────────────────────────────────────────

@router.get("/loans", response_model=List[LoanGivenOut])
def list_loans(
    scope: Optional[FinanceScope] = None,
    is_settled: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(LoanGiven)
    if scope:
        q = q.filter(LoanGiven.scope == scope)
    if is_settled is not None:
        q = q.filter(LoanGiven.is_settled == is_settled)
    return [_loan_out(l) for l in q.order_by(LoanGiven.given_at.desc()).all()]


@router.post("/loans", response_model=LoanGivenOut, status_code=201)
def create_loan(
    payload: LoanGivenCreate,
    db: Session = Depends(get_db),
    _: User = Depends(role_required(*OWNER_ROLES)),
):
    return _loan_out(create_loan_given(db, payload))


@router.get("/loans/{loan_id}", response_model=LoanGivenOut)
def get_loan(
    loan_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    loan = db.query(LoanGiven).filter_by(id=loan_id).first()
    if not loan:
        raise HTTPException(404, "Loan not found")
    return _loan_out(loan)


@router.put("/loans/{loan_id}", response_model=LoanGivenOut)
def update_loan(
    loan_id: UUID,
    payload: LoanGivenUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(role_required(*OWNER_ROLES)),
):
    loan = db.query(LoanGiven).filter_by(id=loan_id).first()
    if not loan:
        raise HTTPException(404, "Loan not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(loan, field, value)
    db.commit()
    db.refresh(loan)
    return _loan_out(loan)


@router.post("/loans/{loan_id}/repay", response_model=LoanRepaymentOut, status_code=201)
def repay_loan(
    loan_id: UUID,
    payload: LoanRepaymentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(role_required(*OWNER_ROLES)),
):
    loan = db.query(LoanGiven).filter_by(id=loan_id).first()
    if not loan:
        raise HTTPException(404, "Loan not found")
    if loan.is_settled:
        raise HTTPException(400, "Loan is already fully settled")
    remaining = loan.principal_amount - loan.amount_repaid
    if payload.amount > remaining:
        raise HTTPException(400, f"Repayment ₦{payload.amount} exceeds outstanding balance ₦{remaining}")
    return LoanRepaymentOut.from_orm(record_loan_repayment(db, loan_id, payload))


# ── Debts Owed ────────────────────────────────────────────────────────────────

@router.get("/debts", response_model=List[DebtOwedOut])
def list_debts(
    scope: Optional[FinanceScope] = None,
    is_settled: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(DebtOwed)
    if scope:
        q = q.filter(DebtOwed.scope == scope)
    if is_settled is not None:
        q = q.filter(DebtOwed.is_settled == is_settled)
    return [_debt_out(d) for d in q.order_by(DebtOwed.borrowed_at.desc()).all()]


@router.post("/debts", response_model=DebtOwedOut, status_code=201)
def create_debt(
    payload: DebtOwedCreate,
    db: Session = Depends(get_db),
    _: User = Depends(role_required(*OWNER_ROLES)),
):
    return _debt_out(create_debt_owed(db, payload))


@router.get("/debts/{debt_id}", response_model=DebtOwedOut)
def get_debt(
    debt_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    debt = db.query(DebtOwed).filter_by(id=debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    return _debt_out(debt)


@router.put("/debts/{debt_id}", response_model=DebtOwedOut)
def update_debt(
    debt_id: UUID,
    payload: DebtOwedUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(role_required(*OWNER_ROLES)),
):
    debt = db.query(DebtOwed).filter_by(id=debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(debt, field, value)
    db.commit()
    db.refresh(debt)
    return _debt_out(debt)


@router.post("/debts/{debt_id}/pay", response_model=DebtPaymentOut, status_code=201)
def pay_debt(
    debt_id: UUID,
    payload: DebtPaymentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(role_required(*OWNER_ROLES)),
):
    debt = db.query(DebtOwed).filter_by(id=debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    if debt.is_settled:
        raise HTTPException(400, "Debt is already fully settled")
    remaining = debt.principal_amount - debt.amount_repaid
    if payload.amount > remaining:
        raise HTTPException(400, f"Payment ₦{payload.amount} exceeds outstanding balance ₦{remaining}")
    return DebtPaymentOut.from_orm(record_debt_payment(db, debt_id, payload))


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/summary/{scope}", response_model=LendingSummary)
def lending_summary(
    scope: FinanceScope,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_lending_summary(db, scope)
