import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOOKING_LIST_FILTERS, LIST_TIMING, useTableState } from '@sinnapi/ui';
import { useListFilters } from '@sinnapi/ui/router';
import { useProfileDirectory, useVendorBookingFacets, useVendorBookings } from '@/hooks/queries';

/**
 * The vendor's bookings list: URL-backed search + filters, server-paginated
 * page state, the dropdowns' facet counts, and row navigation. `vendorId` comes
 * from <VendorGate />, so it is always resolved by the time this runs.
 */
export function useBookings(vendorId: string) {
  const navigate = useNavigate();
  const list = useListFilters(BOOKING_LIST_FILTERS);
  // `filters` in the table state: a new search or filter returns to page 1.
  const table = useTableState({
    sort: { field: 'event_date', direction: 'desc' },
    filters: list.query,
    // Pager clicks: instant on screen, at most one request per window.
    throttleMs: LIST_TIMING.pageThrottleMs,
  });
  const { data, isLoading, isFetching, error } = useVendorBookings(vendorId, table.params);
  const facets = useVendorBookingFacets(vendorId, list.countsQuery);

  const rows = data?.rows ?? [];

  // One directory call for the whole page rather than a join: RLS keeps client
  // profiles out of an embed, so the names arrive a moment after the rows and
  // the table renders "Client" in the gap — the same placeholder it used to
  // show permanently.
  const { profiles, isLoading: namesLoading } = useProfileDirectory(rows.map((b) => b.client_id));

  // Stable while the directory is, so the column set it feeds is built once per
  // batch of names rather than on every render of the table.
  const clientName = useCallback(
    (id: string | null) => (id && profiles[id]?.full_name) || 'Client',
    [profiles],
  );

  function openBooking(id: string) {
    navigate(`/bookings/${id}`);
  }

  return {
    rows,
    clientName,
    /** Names still on their way — cards show a placeholder bar, not "Client". */
    namesLoading,
    total: data?.total ?? 0,
    isLoading,
    // An open search/filter window counts: the rows on screen are already stale.
    isFetching: isFetching || list.isPending,
    error,
    table,
    list,
    facetCounts: facets.data,
    openBooking,
  };
}
