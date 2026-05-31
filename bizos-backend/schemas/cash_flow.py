from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import UUID4, BaseModel, Field

from models.cash_flow import CashEventType, FinanceScope


class OpeningBalanceSet(BaseModel):
    scope: FinanceScope
    opening_balance: Decimal = Field(ge=Decimal("0"))
    opened_at: Optional[date] = None


class CashBalanceOut(BaseModel):
    id: UUID4
    scope: FinanceScope
    opening_balance: Decimal
    opened_at: date
    current_balance: Decimal   # opening + sum(all signed_amounts)
    total_in: Decimal
    total_out: Decimal

    class Config:
        from_attributes = True


class CashEventOut(BaseModel):
    id: UUID4
    scope: FinanceScope
    event_type: CashEventType
    signed_amount: Decimal
    description: Optional[str]
    reference_id: Optional[UUID4]
    reference_type: Optional[str]
    event_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class CashFlowTimeline(BaseModel):
    scope: FinanceScope
    period_start: date
    period_end: date
    opening_balance: Decimal
    events: List[CashEventOut]
    closing_balance: Decimal


class LiquidityForecastItem(BaseModel):
    date: date
    description: str
    expected_amount: Decimal
    direction: str   # "in" or "out"
    source_type: str # "loan_repayment", "debt_due", "projected_expense"


class LiquidityForecast(BaseModel):
    scope: FinanceScope
    current_balance: Decimal
    forecast_days: int
    expected_inflows: Decimal
    expected_outflows: Decimal
    projected_balance: Decimal
    items: List[LiquidityForecastItem]


class NetWorth(BaseModel):
    business_cash: Decimal
    personal_cash: Decimal
    total_cash: Decimal
    loans_given_outstanding: Decimal   # money others owe you
    debts_owed_outstanding: Decimal    # money you owe others
    inventory_value: Decimal
    net_worth: Decimal                 # cash + loans_given - debts_owed + inventory
