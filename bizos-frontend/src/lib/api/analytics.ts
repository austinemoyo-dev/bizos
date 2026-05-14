import { api } from './client';
import { withOfflineCache } from '@/lib/db/offlineCache';
import { BusinessSummary, RevenueTrendPoint, ExpenseBreakdownItem, PersonalSummary, DebtorItem, MonthlyGoal } from '@/types/api';

export interface PersonalSpendingPoint {
  date: string;
  income: number;
  expenses: number;
  savings: number;
  net: number;
}

export interface PersonalCategoryItem {
  category: string;
  amount: number;
  count: number;
}

export interface TopItemData {
  item_id: string;
  item_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
}

export interface RepairStatData {
  device_type: string;
  job_count: number;
  total_revenue: number;
}

export const analyticsApi = {
  businessSummary: (params?: { period_start?: string; period_end?: string }) =>
    withOfflineCache(`biz-summary-${JSON.stringify(params ?? {})}`, () => {
      const qs = new URLSearchParams();
      if (params?.period_start) qs.set('period_start', params.period_start);
      if (params?.period_end) qs.set('period_end', params.period_end);
      return api.get<BusinessSummary>(`/analytics/business/summary?${qs}`);
    }),
  revenueTrend: (params?: { days?: number; period_start?: string; period_end?: string }): Promise<RevenueTrendPoint[]> =>
    withOfflineCache(`biz-revenue-trend-${JSON.stringify(params ?? {})}`, async () => {
      const qs = new URLSearchParams();
      if (params?.days) qs.set('days', String(params.days));
      if (params?.period_start) qs.set('period_start', params.period_start);
      if (params?.period_end) qs.set('period_end', params.period_end);
      const res = await api.get<RevenueTrendPoint[] | { items?: RevenueTrendPoint[] }>(`/analytics/business/revenue-trend?${qs}`);
      return Array.isArray(res) ? res : (res as any)?.items ?? [];
    }),
  expenseBreakdown: (params?: { period_start?: string; period_end?: string }): Promise<ExpenseBreakdownItem[]> =>
    withOfflineCache(`biz-expense-breakdown-${JSON.stringify(params ?? {})}`, async () => {
      const qs = new URLSearchParams();
      if (params?.period_start) qs.set('period_start', params.period_start);
      if (params?.period_end) qs.set('period_end', params.period_end);
      const res = await api.get<ExpenseBreakdownItem[] | { items?: ExpenseBreakdownItem[] }>(`/analytics/business/expense-breakdown?${qs}`);
      const arr = Array.isArray(res) ? res : (res as any)?.items ?? [];
      return arr.map((e: any) => ({ ...e, amount: e.amount ?? e.total ?? 0 }));
    }),
  topItems: async (params?: { period_start?: string; period_end?: string; limit?: number }): Promise<TopItemData[]> => {
    const qs = new URLSearchParams();
    if (params?.period_start) qs.set('period_start', params.period_start);
    if (params?.period_end) qs.set('period_end', params.period_end);
    if (params?.limit) qs.set('limit', String(params.limit));
    const res = await api.get<TopItemData[]>(`/analytics/business/top-items?${qs}`);
    return Array.isArray(res) ? res : [];
  },
  repairStats: async (params?: { period_start?: string; period_end?: string }): Promise<RepairStatData[]> => {
    const qs = new URLSearchParams();
    if (params?.period_start) qs.set('period_start', params.period_start);
    if (params?.period_end) qs.set('period_end', params.period_end);
    const res = await api.get<RepairStatData[]>(`/analytics/business/repair-stats?${qs}`);
    return Array.isArray(res) ? res : [];
  },
  personalSummary: (params?: { period_start?: string; period_end?: string }) =>
    withOfflineCache(`personal-summary-${JSON.stringify(params ?? {})}`, () => {
      const qs = new URLSearchParams();
      if (params?.period_start) qs.set('period_start', params.period_start);
      if (params?.period_end) qs.set('period_end', params.period_end);
      return api.get<PersonalSummary>(`/analytics/personal/summary?${qs}`);
    }),
  personalSpendingTrend: async (params?: { period_start?: string; period_end?: string }): Promise<PersonalSpendingPoint[]> => {
    const qs = new URLSearchParams();
    if (params?.period_start) qs.set('period_start', params.period_start);
    if (params?.period_end) qs.set('period_end', params.period_end);
    const res = await api.get<PersonalSpendingPoint[]>(`/analytics/personal/spending-trend?${qs}`);
    return Array.isArray(res) ? res : [];
  },
  personalCategoryBreakdown: async (params?: { period_start?: string; period_end?: string; tx_type?: string }): Promise<PersonalCategoryItem[]> => {
    const qs = new URLSearchParams();
    if (params?.period_start) qs.set('period_start', params.period_start);
    if (params?.period_end) qs.set('period_end', params.period_end);
    if (params?.tx_type) qs.set('tx_type', params.tx_type);
    const res = await api.get<PersonalCategoryItem[]>(`/analytics/personal/category-breakdown?${qs}`);
    return Array.isArray(res) ? res : [];
  },
  debtors: async (): Promise<DebtorItem[]> => {
    const res = await api.get<DebtorItem[] | { items?: DebtorItem[] }>('/analytics/business/debtors');
    return Array.isArray(res) ? res : (res as any)?.items ?? [];
  },
  
  getMonthlyGoal: (params?: { month?: number; year?: number }) => {
    const qs = new URLSearchParams();
    if (params?.month) qs.set('month', String(params.month));
    if (params?.year) qs.set('year', String(params.year));
    return api.get<MonthlyGoal>(`/analytics/business/goals?${qs}`);
  },
  
  updateMonthlyGoal: (month: number, year: number, data: { revenue_target?: number; profit_target?: number }) => 
    api.put<MonthlyGoal>(`/analytics/business/goals?month=${month}&year=${year}`, data),
};
