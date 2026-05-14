import { api, toPage } from './client';
import { RepairJob, RepairJobCreate, RepairJobUpdate, AddPartPayload, RepairStatus, CancelJobPayload, PaginatedResponse } from '@/types/api';

export const repairsApi = {
  list: async (params?: { status?: string; q?: string; page?: number; size?: number; date_from?: string; date_to?: string }): Promise<PaginatedResponse<RepairJob>> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.q) qs.set('q', params.q);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.size) qs.set('size', String(params.size || 20));
    const raw = await api.get<RepairJob[] | PaginatedResponse<RepairJob>>(`/repairs?${qs}`);
    return toPage(raw as any);
  },
  get: (id: string) => api.get<RepairJob>(`/repairs/${id}`),
  create: (data: RepairJobCreate) => api.post<RepairJob>('/repairs', data),
  update: (id: string, data: RepairJobUpdate) => api.put<RepairJob>(`/repairs/${id}`, data),
  updateStatus: (id: string, status: RepairStatus) =>
    api.patch<RepairJob>(`/repairs/${id}/status`, { status }),
  addPart: (id: string, data: AddPartPayload) =>
    api.post<RepairJob>(`/repairs/${id}/parts`, data),
  removePart: (jobId: string, partId: string) =>
    api.delete<void>(`/repairs/${jobId}/parts/${partId}`),
  cancelJob: (id: string, data: CancelJobPayload) =>
    api.post<RepairJob>(`/repairs/${id}/cancel`, data),
  updatePayment: (id: string, amount_paid: number) => 
    api.patch<RepairJob>(`/repairs/${id}/payment`, { amount_paid }),
};
