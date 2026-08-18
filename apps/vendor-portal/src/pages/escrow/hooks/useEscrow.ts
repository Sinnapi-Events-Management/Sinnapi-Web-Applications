import { useTableState } from '@sinnapi/ui';
import { useVendorEscrow } from '@/hooks/queries';

/** The vendor's escrow activity: server-paginated page state, newest first. */
export function useEscrow(vendorId: string) {
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useVendorEscrow(vendorId, table.params);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
  };
}
