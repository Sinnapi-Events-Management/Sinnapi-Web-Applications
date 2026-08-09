import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import { useVendorQuotations } from '@/hooks/queries';

/**
 * The vendor's quote requests: server-paginated page state plus row navigation
 * into the builder. `vendorId` is resolved by <VendorGate />.
 */
export function useQuotations(vendorId: string) {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useVendorQuotations(vendorId, table.params);

  function openQuotation(id: string) {
    navigate(`/quotations/${id}`);
  }

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    openQuotation,
  };
}
