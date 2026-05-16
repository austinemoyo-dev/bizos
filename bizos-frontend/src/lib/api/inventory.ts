import { api, toPage } from './client';
import { withOfflineCache } from '@/lib/db/offlineCache';
import { Item, ItemCreate, RestockPayload, CsvImportResult, StockMovement, PaginatedResponse } from '@/types/api';

export const inventoryApi = {
  list: (params?: { q?: string; category?: string; page?: number; size?: number }): Promise<PaginatedResponse<Item>> =>
    withOfflineCache(`inventory-list-${JSON.stringify(params ?? {})}`, async () => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set('category', params.category);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.size) qs.set('size', String(params.size));
      const raw = await api.get<Item[] | PaginatedResponse<Item>>(`/inventory?${qs}`);
      const page = toPage(raw as Item[] | PaginatedResponse<Item>);
      if (params?.q) {
        const q = params.q.toLowerCase();
        page.items = page.items.filter(
          (i: Item) => i.name.toLowerCase().includes(q) || (i.sku ?? '').toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
        );
        page.total = page.items.length;
      }
      return page;
    }),
  lowStock: () =>
    withOfflineCache('inventory-low-stock', () => api.get<Item[]>('/inventory/low-stock')),
  search: (q: string) => api.get<Item[]>(`/inventory/search?q=${encodeURIComponent(q)}`),
  get: (id: string) => api.get<Item>(`/inventory/${id}`),
  create: (data: ItemCreate) => api.post<Item>('/inventory', data),
  update: (id: string, data: Partial<ItemCreate>) => api.put<Item>(`/inventory/${id}`, data),
  restock: (id: string, data: RestockPayload) => api.post<Item>(`/inventory/${id}/restock`, data),
  delete: (id: string) => api.delete<void>(`/inventory/${id}`),
  movements: (id: string): Promise<StockMovement[]> =>
    withOfflineCache(`inventory-movements-${id}`, async () => {
      const res = await api.get<StockMovement[] | { items?: StockMovement[] }>(`/inventory/${id}/movements`);
      return Array.isArray(res) ? res : (res as any)?.items ?? [];
    }),
  csvTemplate: () => api.get<Blob>('/inventory/template/csv'),
  importCsv: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<CsvImportResult>('/inventory/import/csv', fd);
  },
};
