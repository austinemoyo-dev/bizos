import { api, toPage } from './client';
import { withOfflineCache } from '@/lib/db/offlineCache';
import { Expense, ExpenseCreate, PaginatedResponse } from '@/types/api';

export const expensesApi = {
  list: (params?: { category?: string; page?: number; size?: number; date_from?: string; date_to?: string }): Promise<PaginatedResponse<Expense>> =>
    withOfflineCache(`expenses-list-${JSON.stringify(params ?? {})}`, async () => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set('category', params.category);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.size) qs.set('size', String(params.size));
      if (params?.date_from) qs.set('date_from', params.date_from);
      if (params?.date_to) qs.set('date_to', params.date_to);
      const raw = await api.get<Expense[] | PaginatedResponse<Expense>>(`/expenses?${qs}`);
      return toPage(raw as any);
    }),
  create: (data: ExpenseCreate) => api.post<Expense>('/expenses', data),
  delete: (id: string) => api.delete<void>(`/expenses/${id}`),
};
