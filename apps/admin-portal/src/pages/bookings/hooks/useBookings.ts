import { useBookingsAdmin } from '@/hooks/queries';
import { useTableState } from '@sinnapi/ui';

export function useBookings() {
  const table = useTableState({ sort: { field: 'event_date', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useBookingsAdmin(table.params);

  return { rows: data?.rows ?? [], total: data?.total ?? 0, isLoading, isFetching, error, table };
}
