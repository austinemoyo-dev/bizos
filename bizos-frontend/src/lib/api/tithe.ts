import { api, toPage } from './client';
import { withOfflineCache } from '@/lib/db/offlineCache';
import { Tithe, TithePayPayload, PaginatedResponse } from '@/types/api';

export const titheApi = {
  list: (params?: { scope?: string; paid?: boolean; page?: number; date_from?: string; date_to?: string }): Promise<PaginatedResponse<Tithe>> =>
    withOfflineCache(`tithe-list-${JSON.stringify(params ?? {})}`, async () => {
      const qs = new URLSearchParams();
      if (params?.scope) qs.set('scope', params.scope);
      if (params?.paid !== undefined) qs.set('paid', String(params.paid));
      if (params?.page) qs.set('page', String(params.page));
      if (params?.date_from) qs.set('date_from', params.date_from);
      if (params?.date_to) qs.set('date_to', params.date_to);
      const raw = await api.get<Tithe[] | PaginatedResponse<Tithe>>(`/tithe?${qs}`);
      return toPage(raw as any);
    }),
  markPaid: (id: string, data?: TithePayPayload) => api.post<Tithe>(`/tithe/${id}/pay`, data ?? {}),
  /** Calculate 10% of net profit/income for the month and create/refresh a tithe record. */
  generate: (year: number, month: number, scope: 'business' | 'personal' = 'business') =>
    api.post<Tithe | null>(`/tithe/generate?year=${year}&month=${month}&scope=${scope}`, {}),
};
