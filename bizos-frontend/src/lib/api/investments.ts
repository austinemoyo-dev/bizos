import { api } from './client';
import { Investment, InvestmentCreate, InvestmentType, RepaymentPayload } from '@/types/api';

export const investmentsApi = {
  list: (type?: InvestmentType) =>
    api.get<Investment[]>(`/investments${type ? `?type=${type}` : ''}`),
  create: (data: InvestmentCreate) => api.post<Investment>('/investments', data),
  update: (id: string, data: Partial<InvestmentCreate>) =>
    api.put<Investment>(`/investments/${id}`, data),
  repay: (id: string, data: RepaymentPayload) =>
    api.post<Investment>(`/investments/${id}/repay`, data),
};
