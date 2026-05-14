import { api, toPage } from './client';
import { withOfflineCache } from '@/lib/db/offlineCache';
import { Sale, SaleCreate, PaginatedResponse } from '@/types/api';

export const salesApi = {
  list: (params?: { page?: number; size?: number; date_from?: string; date_to?: string }): Promise<PaginatedResponse<Sale>> =>
    withOfflineCache(`sales-list-${JSON.stringify(params ?? {})}`, async () => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.size) qs.set('size', String(params.size));
      if (params?.date_from) qs.set('date_from', params.date_from);
      if (params?.date_to) qs.set('date_to', params.date_to);
      const raw = await api.get<Sale[] | PaginatedResponse<Sale>>(`/sales?${qs}`);
      return toPage(raw as any);
    }),
  get: (id: string) => api.get<Sale>(`/sales/${id}`),
  create: (data: SaleCreate) => api.post<Sale>('/sales', data),
  delete: (id: string) => api.delete<void>(`/sales/${id}`),
  updatePayment: (id: string, amount_paid: number) => api.patch<Sale>(`/sales/${id}/payment`, { amount_paid }),
};
