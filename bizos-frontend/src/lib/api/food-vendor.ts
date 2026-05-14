import { api } from './client';
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

export const foodVendorApi = {
  credits: {
    list: (params?: { paid?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.paid !== undefined) qs.set('paid', String(params.paid));
      return api.get<FoodCredit[]>(`/food-vendor/credits?${qs}`);
    },
    create: (data: FoodCreditCreate) => api.post<FoodCredit>('/food-vendor/credits', data),
  },
  pay: (credit_ids: string[], vendor_name: string = 'Food Vendor') =>
    api.post<FoodVendorPayment>('/food-vendor/pay', { credit_ids, vendor_name }),
  payments: () => api.get<FoodVendorPayment[]>('/food-vendor/payments'),
  analytics: () => api.get<FoodVendorAnalytics>('/food-vendor/analytics'),
  trend: (days = 30) => api.get<FoodTrendPoint[]>(`/food-vendor/trend?days=${days}`),
  vendorBreakdown: () => api.get<VendorSpendingSummary[]>('/food-vendor/vendor-breakdown'),
};
