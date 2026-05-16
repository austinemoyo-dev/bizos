import { api, toPage } from './client';
import { withOfflineCache } from '@/lib/db/offlineCache';
import { PersonalTransaction, PersonalTransactionCreate, SavingsGoal, SavingsGoalCreate, MarketItem, MarketItemCreate, PaginatedResponse } from '@/types/api';

export const personalApi = {
  transactions: {
    list: (params?: { type?: string; category?: string; page?: number; size?: number; date_from?: string; date_to?: string }): Promise<PaginatedResponse<PersonalTransaction>> =>
      withOfflineCache(`personal-tx-list-${JSON.stringify(params ?? {})}`, async () => {
        const qs = new URLSearchParams();
        if (params?.type) qs.set('type', params.type);
        if (params?.category) qs.set('category', params.category);
        if (params?.date_from) qs.set('date_from', params.date_from);
        if (params?.date_to) qs.set('date_to', params.date_to);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.size) qs.set('size', String(params.size));
        const raw = await api.get<PersonalTransaction[] | PaginatedResponse<PersonalTransaction>>(`/personal/transactions?${qs}`);
        return toPage(raw as any);
      }),
    create: (data: PersonalTransactionCreate) =>
      api.post<PersonalTransaction>('/personal/transactions', data),
    delete: (id: string) => api.delete<void>(`/personal/transactions/${id}`),
  },
  savings: {
    list: (): Promise<SavingsGoal[]> =>
      withOfflineCache('savings-list', () => api.get<SavingsGoal[]>('/personal/savings')),
    create: (data: SavingsGoalCreate) => api.post<SavingsGoal>('/personal/savings', data),
    update: (id: string, data: Partial<SavingsGoalCreate>) => api.put<SavingsGoal>(`/personal/savings/${id}`, data),
    deposit: (id: string, amount: number) =>
      api.post<SavingsGoal>(`/personal/savings/${id}/deposit`, { amount }),
    delete: (id: string) => api.delete<void>(`/personal/savings/${id}`),
  },
  marketList: {
    list: (): Promise<MarketItem[]> =>
      withOfflineCache('market-list', () => api.get<MarketItem[]>('/personal/market-list')),
    create: (data: MarketItemCreate) => api.post<MarketItem>('/personal/market-list', data),
    toggle: (id: string) => api.patch<MarketItem>(`/personal/market-list/${id}/toggle`, {}),
    delete: (id: string) => api.delete<void>(`/personal/market-list/${id}`),
  },
};
