import { api } from './client';
import { withOfflineCache } from '@/lib/db/offlineCache';
import { Investment, InvestmentCreate, InvestmentType, RepaymentPayload } from '@/types/api';

export const investmentsApi = {
  list: (type?: InvestmentType): Promise<Investment[]> =>
    withOfflineCache(`investments-list-${type ?? 'all'}`, () =>
      api.get<Investment[]>(`/investments${type ? `?type=${type}` : ''}`)),
  create: (data: InvestmentCreate) => api.post<Investment>('/investments', data),
  update: (id: string, data: Partial<InvestmentCreate>) =>
    api.put<Investment>(`/investments/${id}`, data),
  repay: (id: string, data: RepaymentPayload) =>
    api.post<Investment>(`/investments/${id}/repay`, data),
};
