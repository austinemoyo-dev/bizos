import { api, toPage } from './client';
import { Item, ItemCreate, RestockPayload, PaginatedResponse } from '@/types/api';

export const inventoryApi = {
  list: async (params?: { q?: string; category?: string; page?: number; size?: number }): Promise<PaginatedResponse<Item>> => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.size) qs.set('size', String(params.size));
    // Note: the backend list endpoint doesn't support ?q — use /search for that
    const raw = await api.get<Item[] | PaginatedResponse<Item>>(`/inventory?${qs}`);
    const page = toPage(raw as Item[] | PaginatedResponse<Item>);
    // Client-side filter by q if provided (backend search is a separate endpoint)
    if (params?.q) {
      const q = params.q.toLowerCase();
      page.items = page.items.filter(
        (i: Item) => i.name.toLowerCase().includes(q) || (i.sku ?? '').toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      );
      page.total = page.items.length;
    }
    return page;
  },
  lowStock: () => api.get<Item[]>('/inventory/low-stock'),
  search: (q: string) => api.get<Item[]>(`/inventory/search?q=${encodeURIComponent(q)}`),
  get: (id: string) => api.get<Item>(`/inventory/${id}`),
  create: (data: ItemCreate) => api.post<Item>('/inventory', data),
  update: (id: string, data: Partial<ItemCreate>) => api.put<Item>(`/inventory/${id}`, data),
  restock: (id: string, data: RestockPayload) => api.post<Item>(`/inventory/${id}/restock`, data),
  delete: (id: string) => api.delete<void>(`/inventory/${id}`),
};
