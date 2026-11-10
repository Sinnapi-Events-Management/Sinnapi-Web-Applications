import { useNavigate } from 'react-router-dom';
import { BOOKING_LIST_FILTERS, LIST_TIMING, useTableState } from '@sinnapi/ui';
import { useListFilters } from '@sinnapi/ui/router';
import { useBookingFacets, useBookings as useBookingsQuery } from '@/hooks/queries';

/**
 * The bookings list: URL-backed search + filters, server-paginated page state,
 * the dropdowns' facet counts, and row navigation. The page reads
 * `table.controls` straight onto <DataTable /> and `list` onto <ListToolbar />.
 */
export function useBookings() {
  const navigate = useNavigate();
  const list = useListFilters(BOOKING_LIST_FILTERS);
  // `filters` in the table state: a new search or filter returns to page 1.
  const table = useTableState({
    sort: { field: 'event_date', direction: 'desc' },
    filters: list.query,
    // Pager clicks: instant on screen, at most one request per window.
    throttleMs: LIST_TIMING.pageThrottleMs,
  });
  const { data, isLoading, isFetching, error } = useBookingsQuery(table.params);
  const facets = useBookingFacets(list.countsQuery);

  function openBooking(id: string) {
    navigate(`/bookings/${id}`);
  }

  return {
    rows: data?.rows ?? [],
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
