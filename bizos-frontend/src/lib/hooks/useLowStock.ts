import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api/inventory';

export function useLowStock() {
  const { data } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => inventoryApi.lowStock(),
    staleTime: 5 * 60_000,
  });
  return { items: data ?? [], count: data?.length ?? 0 };
}
