import { api } from './client';
import { FoodCredit, FoodCreditCreate, FoodVendorPayment } from '@/types/api';

export const foodVendorApi = {
  credits: {
    list: (params?: { paid?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.paid !== undefined) qs.set('paid', String(params.paid));
      return api.get<FoodCredit[]>(`/food-vendor/credits?${qs}`);
    },
    create: (data: FoodCreditCreate) => api.post<FoodCredit>('/food-vendor/credits', data),
  },
  pay: (credit_ids: string[]) =>
    api.post<FoodVendorPayment>('/food-vendor/pay', { credit_ids }),
  payments: () => api.get<FoodVendorPayment[]>('/food-vendor/payments'),
};
