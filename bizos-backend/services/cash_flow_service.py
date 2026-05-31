from datetime import date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.cash_flow import CashBalance, CashEvent, CashEventType, FinanceScope
from models.inventory import Item
from models.lending import DebtOwed, LoanGiven
from schemas.cash_flow import (
    CashBalanceOut,
    CashFlowTimeline,
    CashEventOut,
    LiquidityForecast,
    LiquidityForecastItem,
    NetWorth,
)


def _get_or_create_balance(db: Session, scope: FinanceScope) -> CashBalance:
    row = db.query(CashBalance).filter_by(scope=scope).first()
    if not row:
        row = CashBalance(scope=scope, opening_balance=Decimal("0"), opened_at=date.today())
        db.add(row)
        db.flush()
    return row


def set_opening_balance(db: Session, scope: FinanceScope, amount: Decimal, opened_at: Optional[date] = None) -> CashBalanceOut:
    row = db.query(CashBalance).filter_by(scope=scope).first()
    if row:
        row.opening_balance = amount
        if opened_at:
            row.opened_at = opened_at
    else:
        row = CashBalance(
            scope=scope,
            opening_balance=amount,
            opened_at=opened_at or date.today(),
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _build_balance_out(db, row)


def get_cash_position(db: Session, scope: FinanceScope) -> CashBalanceOut:
    row = _get_or_create_balance(db, scope)
    db.commit()
    return _build_balance_out(db, row)


def _build_balance_out(db: Session, row: CashBalance) -> CashBalanceOut:
    totals = (
        db.query(
            func.sum(
                func.case((CashEvent.signed_amount > 0, CashEvent.signed_amount), else_=0)
            ).label("total_in"),
            func.sum(
                func.case((CashEvent.signed_amount < 0, CashEvent.signed_amount), else_=0)
            ).label("total_out"),
            func.sum(CashEvent.signed_amount).label("net"),
        )
        .filter(CashEvent.scope == row.scope)
        .first()
    )
    total_in = totals.total_in or Decimal("0")
    total_out = abs(totals.total_out or Decimal("0"))
    net = totals.net or Decimal("0")
    return CashBalanceOut(
        id=row.id,
        scope=row.scope,
        opening_balance=row.opening_balance,
        opened_at=row.opened_at,
        current_balance=row.opening_balance + net,
        total_in=total_in,
        total_out=total_out,
    )


def emit_cash_event(
    db: Session,
    scope: FinanceScope,
    event_type: CashEventType,
    signed_amount: Decimal,
    description: str,
    event_date: Optional[date] = None,
    reference_id=None,
    reference_type: Optional[str] = None,
    auto_commit: bool = False,
) -> CashEvent:
    """Create a CashEvent record. Call before db.commit() in the parent transaction."""
    # Only emit events if an opening balance has been set for this scope
    balance_row = db.query(CashBalance).filter_by(scope=scope).first()
    if not balance_row:
        return None

    event = CashEvent(
        scope=scope,
        event_type=event_type,
        signed_amount=signed_amount,
        description=description,
        reference_id=reference_id,
        reference_type=reference_type,
        event_date=event_date or date.today(),
    )
    db.add(event)
    if auto_commit:
        db.commit()
    return event


def get_cash_flow_timeline(
    db: Session,
    scope: FinanceScope,
    period_start: date,
    period_end: date,
) -> CashFlowTimeline:
    row = _get_or_create_balance(db, scope)
    db.commit()

    # Sum of all events BEFORE period_start to get the balance at period start
    pre_net = (
        db.query(func.sum(CashEvent.signed_amount))
        .filter(CashEvent.scope == scope, CashEvent.event_date < period_start)
        .scalar()
        or Decimal("0")
    )
    opening = row.opening_balance + pre_net

    events = (
        db.query(CashEvent)
        .filter(
            CashEvent.scope == scope,
            CashEvent.event_date >= period_start,
            CashEvent.event_date <= period_end,
        )
        .order_by(CashEvent.event_date, CashEvent.created_at)
        .all()
    )

    period_net = sum((e.signed_amount for e in events), Decimal("0"))
    return CashFlowTimeline(
        scope=scope,
        period_start=period_start,
        period_end=period_end,
        opening_balance=opening,
        events=[CashEventOut.from_orm(e) for e in events],
        closing_balance=opening + period_net,
    )


def get_liquidity_forecast(db: Session, scope: FinanceScope, days: int = 30) -> LiquidityForecast:
    from datetime import timedelta
    today = date.today()
    horizon = today + timedelta(days=days)

    position = get_cash_position(db, scope)
    items: List[LiquidityForecastItem] = []

    # Upcoming loan repayments expected (loans given with due_date in window)
    due_loans = (
        db.query(LoanGiven)
        .filter(
            LoanGiven.scope == scope,
            LoanGiven.is_settled == False,
            LoanGiven.due_date != None,
            LoanGiven.due_date >= today,
            LoanGiven.due_date <= horizon,
        )
        .all()
    )
    for loan in due_loans:
        items.append(LiquidityForecastItem(
            date=loan.due_date,
            description=f"Expected repayment from {loan.borrower_name}",
            expected_amount=Decimal(str(loan.outstanding)),
            direction="in",
            source_type="loan_repayment_due",
        ))

    # Upcoming debt payments due
    due_debts = (
        db.query(DebtOwed)
        .filter(
            DebtOwed.scope == scope,
            DebtOwed.is_settled == False,
            DebtOwed.due_date != None,
            DebtOwed.due_date >= today,
            DebtOwed.due_date <= horizon,
        )
        .all()
    )
    for debt in due_debts:
        items.append(LiquidityForecastItem(
            date=debt.due_date,
            description=f"Debt due to {debt.creditor_name}",
            expected_amount=Decimal(str(debt.outstanding)),
            direction="out",
            source_type="debt_due",
        ))

    items.sort(key=lambda x: x.date)

    expected_in = sum((i.expected_amount for i in items if i.direction == "in"), Decimal("0"))
    expected_out = sum((i.expected_amount for i in items if i.direction == "out"), Decimal("0"))

    return LiquidityForecast(
        scope=scope,
        current_balance=position.current_balance,
        forecast_days=days,
        expected_inflows=expected_in,
        expected_outflows=expected_out,
        projected_balance=position.current_balance + expected_in - expected_out,
        items=items,
    )


def get_net_worth(db: Session) -> NetWorth:
    biz = get_cash_position(db, FinanceScope.business)
    pers = get_cash_position(db, FinanceScope.personal)

    loans_outstanding = (
        db.query(func.sum(LoanGiven.principal_amount - LoanGiven.amount_repaid))
        .filter(LoanGiven.is_settled == False)
        .scalar()
        or Decimal("0")
    )
    debts_outstanding = (
        db.query(func.sum(DebtOwed.principal_amount - DebtOwed.amount_repaid))
        .filter(DebtOwed.is_settled == False)
        .scalar()
        or Decimal("0")
    )
    inventory_value = (
        db.query(func.sum(Item.purchase_price * Item.quantity_in_stock))
        .filter(Item.is_active == True)
        .scalar()
        or Decimal("0")
    )

    total_cash = biz.current_balance + pers.current_balance
    net = total_cash + loans_outstanding + inventory_value - debts_outstanding

    return NetWorth(
        business_cash=biz.current_balance,
        personal_cash=pers.current_balance,
        total_cash=total_cash,
        loans_given_outstanding=loans_outstanding,
        debts_owed_outstanding=debts_outstanding,
        inventory_value=inventory_value,
        net_worth=net,
    )
