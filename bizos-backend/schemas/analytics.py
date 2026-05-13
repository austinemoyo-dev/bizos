from datetime import date
from decimal import Decimal
from typing import List

from pydantic import BaseModel


class BusinessSummary(BaseModel):
    period_start: date
    period_end: date
    total_revenue: Decimal
    total_expenses: Decimal
    net_profit: Decimal         # revenue - all expenses (incl. paid tithe)
    cash_collected: Decimal     # Total cash received from sales and repairs
    tithe_due: Decimal          # all unpaid tithe (any period) — total obligation
    tithe_paid: Decimal         # tithe paid in this period
    available_balance: Decimal  # cash_collected - total_expenses
    repair_count: int
    sale_count: int
    pending_jobs: int
    low_stock_count: int
    inventory_value: Decimal


class DebtorItem(BaseModel):
    id: str
    type: str  # 'sale' | 'repair'
    customer_name: str
    reference: str  # item name or job number
    total_amount: Decimal
    amount_paid: Decimal
    balance: Decimal
    date: date


class RevenueTrendPoint(BaseModel):
    date: date
    revenue: Decimal
    expenses: Decimal
    profit: Decimal


class ExpenseBreakdown(BaseModel):
    category: str
    total: Decimal
    percentage: float
    count: int


class TopItem(BaseModel):
    item_id: str
    item_name: str
    total_quantity: int
    total_revenue: Decimal


class RepairStats(BaseModel):
    device_type: str
    job_count: int
    total_revenue: Decimal
    avg_profit: Decimal


class PersonalSummaryAnalytics(BaseModel):
    period_start: date
    period_end: date
    total_income: Decimal
    total_expenses: Decimal
    balance: Decimal


class SpendingTrendPoint(BaseModel):
    date: date
    expenses: Decimal


class PeriodComparison(BaseModel):
    current_revenue: Decimal
    previous_revenue: Decimal
    current_expenses: Decimal
    previous_expenses: Decimal
    current_profit: Decimal
    previous_profit: Decimal
    revenue_change_pct: float
    profit_change_pct: float
