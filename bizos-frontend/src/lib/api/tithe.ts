import { api, toPage } from './client';
import { Tithe, PaginatedResponse } from '@/types/api';

export const titheApi = {
  list: async (params?: { scope?: string; paid?: boolean; page?: number; date_from?: string; date_to?: string }): Promise<PaginatedResponse<Tithe>> => {
    const qs = new URLSearchParams();
    if (params?.scope) qs.set('scope', params.scope);
    if (params?.paid !== undefined) qs.set('paid', String(params.paid));
    if (params?.page) qs.set('page', String(params.page));
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    const raw = await api.get<Tithe[] | PaginatedResponse<Tithe>>(`/tithe?${qs}`);
    return toPage(raw as any);
  },
  markPaid: (id: string) => api.post<Tithe>(`/tithe/${id}/pay`, {}),
};
