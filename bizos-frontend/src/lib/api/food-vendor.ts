import { api } from './client';
import { withOfflineCache } from '@/lib/db/offlineCache';
import { FoodCredit, FoodCreditCreate, FoodVendorPayment } from '@/types/api';

export interface FoodVendorAnalytics {
  weekly_total: number;
  monthly_total: number;
  daily_average: number;
  total_outstanding: number;
  total_paid: number;
  total_credits: number;
  unpaid_count: number;
}

export interface FoodTrendPoint {
  date: string;
  total: number;
  count: number;
}

export interface VendorSpendingSummary {
  vendor_name: string;
  total_spent: number;
  total_meals: number;
  unpaid_amount: number;
}

export interface FoodMonthSummary {
  month: string;        // "YYYY-MM"
  total_spent: number;
  total_paid: number;
  total_credits: number;
  payment_count: number;
}

export const foodVendorApi = {
  credits: {
    list: (params?: { paid?: boolean }): Promise<FoodCredit[]> => {
      const qs = new URLSearchParams();
      if (params?.paid !== undefined) qs.set('paid', String(params.paid));
      return withOfflineCache(`food-credits-${params?.paid ?? 'all'}`, () =>
        api.get<FoodCredit[]>(`/food-vendor/credits?${qs}`));
    },
    listAll: (): Promise<FoodCredit[]> =>
      withOfflineCache('food-credits-all', () =>
        api.get<FoodCredit[]>('/food-vendor/credits')),
    create: (data: FoodCreditCreate) => api.post<FoodCredit>('/food-vendor/credits', data),
    update: (id: string, data: Partial<FoodCreditCreate>) =>
      api.patch<FoodCredit>(`/food-vendor/credits/${id}`, data),
    delete: (id: string) => api.delete<void>(`/food-vendor/credits/${id}`),
  },
  pay: (credit_ids: string[], vendor_name: string = 'Food Vendor') =>
    api.post<FoodVendorPayment>('/food-vendor/pay', { credit_ids, vendor_name }),
  payments: (): Promise<FoodVendorPayment[]> =>
    withOfflineCache('food-payments', () => api.get<FoodVendorPayment[]>('/food-vendor/payments')),
  analytics: (): Promise<FoodVendorAnalytics> =>
    withOfflineCache('food-analytics', () => api.get<FoodVendorAnalytics>('/food-vendor/analytics')),
  trend: (days = 30): Promise<FoodTrendPoint[]> =>
    withOfflineCache(`food-trend-${days}`, () => api.get<FoodTrendPoint[]>(`/food-vendor/trend?days=${days}`)),
  vendorBreakdown: (): Promise<VendorSpendingSummary[]> =>
    withOfflineCache('food-vendor-breakdown', () => api.get<VendorSpendingSummary[]>('/food-vendor/vendor-breakdown')),
  monthlySummary: (months = 6): Promise<FoodMonthSummary[]> =>
    withOfflineCache(`food-monthly-${months}`, () => api.get<FoodMonthSummary[]>(`/food-vendor/monthly-summary?months=${months}`)),
};
