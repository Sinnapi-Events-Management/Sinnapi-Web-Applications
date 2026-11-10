import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUOTATION_LIST_FILTERS, LIST_TIMING, useTableState } from '@sinnapi/ui';
import { useListFilters } from '@sinnapi/ui/router';
import {
  useProfileDirectory,
  useQuotationBookings,
  useVendorQuotationFacets,
  useVendorQuotations,
} from '@/hooks/queries';

/**
 * The vendor's quote requests: URL-backed search + filters, server-paginated
 * page state, row navigation into the builder, and the two per-page lookups the
 * rows need but do not carry. `vendorId` is resolved by <VendorGate />.
 */
export function useQuotations(vendorId: string) {
  const navigate = useNavigate();
  const list = useListFilters(QUOTATION_LIST_FILTERS);
  const table = useTableState({
    sort: { field: 'created_at', direction: 'desc' },
    filters: list.query,
    // Pager clicks: instant on screen, at most one request per window.
    throttleMs: LIST_TIMING.pageThrottleMs,
  });
  const { data, isLoading, isFetching, error } = useVendorQuotations(vendorId, table.params);
  const facets = useVendorQuotationFacets(vendorId, list.countsQuery);

  const rows = data?.rows ?? [];

  // One directory call for the whole page rather than a join — see useBookings
  // for why the client cannot come back on the row itself.
  const { profiles, isLoading: namesLoading } = useProfileDirectory(rows.map((q) => q.client_id));

  const clientName = useCallback(
    (id: string | null) => (id && profiles[id]?.full_name) || 'Client',
    [profiles],
  );

  // Likewise one query for the page: an accepted quote whose client has picked
  // a date and one still waiting on them look identical on the row itself.
  const { bookings } = useQuotationBookings(rows.map((q) => q.id));

  const bookingFor = useCallback((id: string) => bookings[id] ?? null, [bookings]);

  function openQuotation(id: string) {
    navigate(`/quotations/${id}`);
  }

  return {
    rows,
    clientName,
    /** Names still on their way — cards show a placeholder bar, not "Client". */
    namesLoading,
    bookingFor,
    total: data?.total ?? 0,
    isLoading,
    isFetching: isFetching || list.isPending,
    error,
    table,
    list,
    facetCounts: facets.data,
    openQuotation,
  };
}
