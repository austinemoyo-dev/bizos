import { api } from './client';
import type { FinanceScope } from './lending';

export interface CashPosition {
  id: string;
  scope: FinanceScope;
  opening_balance: number;
  opened_at: string;
  current_balance: number;
  total_in: number;
  total_out: number;
}

export interface CashEvent {
  id: string;
  scope: FinanceScope;
  event_type: string;
  signed_amount: number;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  event_date: string;
  created_at: string;
}

export interface CashFlowTimeline {
  scope: FinanceScope;
  period_start: string;
  period_end: string;
  opening_balance: number;
  events: CashEvent[];
  closing_balance: number;
}

export interface LiquidityForecastItem {
  date: string;
  description: string;
  expected_amount: number;
  direction: 'in' | 'out';
  source_type: string;
}

export interface LiquidityForecast {
  scope: FinanceScope;
  current_balance: number;
  forecast_days: number;
  expected_inflows: number;
  expected_outflows: number;
  projected_balance: number;
  items: LiquidityForecastItem[];
}

export interface NetWorth {
  business_cash: number;
  personal_cash: number;
  total_cash: number;
  loans_given_outstanding: number;
  debts_owed_outstanding: number;
  inventory_value: number;
  net_worth: number;
}

export interface BurnRate {
  lookback_months: number;
  average_monthly_burn: number;
  category_breakdown: Record<string, number>;
  this_month: {
    spent_so_far: number;
    projected_total: number;
    remaining_estimated: number;
    days_elapsed: number;
    days_remaining: number;
  };
}

export interface DebtPlan {
  avg_monthly_income: number;
  avg_monthly_expenses: number;
  monthly_disposable: number;
  total_personal_debt: number;
  months_to_clear_all: number | null;
  debts: {
    id: string;
    creditor_name: string;
    outstanding: number;
    due_date: string | null;
    months_to_clear_at_current_rate: number | null;
  }[];
  recommendation: string;
}

export interface BusinessRecovery {
  period: { start: string; end: string };
  revenue_mtd: number;
  expenses_mtd: number;
  profit_mtd: number;
  profit_status: 'profit' | 'loss';
  avg_job_revenue: number;
  recent_job_count: number;
  pending_jobs: number;
  jobs_to_break_even: number | null;
  jobs_to_hit_target: number | null;
  target_revenue: number | null;
  business_debt_outstanding: number;
  jobs_to_clear_business_debt: number | null;
  summary: string;
}

export const cashFlowApi = {
  setOpeningBalance: (data: { scope: FinanceScope; opening_balance: number; opened_at?: string }) =>
    api.post<CashPosition>('/cash-flow/opening-balance', data),

  getPosition: (scope: FinanceScope) =>
    api.get<CashPosition>(`/cash-flow/position/${scope}`),

  getTimeline: (scope: FinanceScope, period_start?: string, period_end?: string) => {
    const qs = new URLSearchParams();
    if (period_start) qs.set('period_start', period_start);
    if (period_end) qs.set('period_end', period_end);
    return api.get<CashFlowTimeline>(`/cash-flow/timeline/${scope}?${qs}`);
  },

  getForecast: (scope: FinanceScope, days = 30) =>
    api.get<LiquidityForecast>(`/cash-flow/forecast/${scope}?days=${days}`),

  getNetWorth: () =>
    api.get<NetWorth>('/cash-flow/net-worth'),

  getBurnRate: (lookback_months = 3) =>
    api.get<BurnRate>(`/cash-flow/planning/burn-rate?lookback_months=${lookback_months}`),

  getDebtPlan: () =>
    api.get<DebtPlan>('/cash-flow/planning/debt-plan'),

  getBusinessRecovery: () =>
    api.get<BusinessRecovery>('/cash-flow/planning/business-recovery'),
};
