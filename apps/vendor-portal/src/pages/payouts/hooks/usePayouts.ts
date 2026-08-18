import { useTableState } from '@sinnapi/ui';
import { useVendorPayouts } from '@/hooks/queries';

/** The vendor's payout history: server-paginated page state, newest first. */
export function usePayouts(vendorId: string) {
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useVendorPayouts(vendorId, table.params);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
  };
}
