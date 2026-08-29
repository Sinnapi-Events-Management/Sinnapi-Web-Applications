import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import { useQuotationBookings, useQuotations as useQuotationsQuery } from '@/hooks/queries';

/**
 * The quotations list: server-paginated page state over the client's quotes,
 * row navigation into the quote itself, and the shortcut that takes an accepted
 * quote straight to its booking form.
 */
export function useQuotations() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useQuotationsQuery(table.params);

  const rows = data?.rows ?? [];

  // One query for the whole page rather than one per row. The list has to know
  // which accepted quotes have already been booked, or it offers "Create
  // booking" on rows where the server would refuse it.
  const { bookings } = useQuotationBookings(rows.map((q) => q.id));

  const bookingFor = useCallback((id: string) => bookings[id] ?? null, [bookings]);

  function openQuotation(id: string) {
    navigate(`/quotations/${id}`);
  }

  /**
   * The same destination as `openQuotation`, with the booking dialog asked for.
   * The quote page decides whether to honour it — see `useQuotationBooking` —
   * because a list row can be a page old and the quote may have moved on.
   *
   * The section is named as well as the dialog. The booking card owns that
   * dialog and now lives in the quote page's Progress tab, and an inactive tab
   * panel is unmounted — so a bare `?book=1` would land on Overview, mount
   * nothing that could honour it, and open nothing at all. Naming the tab in
   * the link fixes that in the one place that knows where the card went, rather
   * than with an effect on the page that would be racing `?book`'s own cleanup
   * to write the same query string.
   *
   * Memoized because it is handed to the column factory, which is itself
   * memoized: an identity that changed every render would rebuild the columns
   * every render and undo the point of that.
   */
  const openBookingForm = useCallback(
    (id: string) => navigate(`/quotations/${id}?tab=progress&book=1`),
    [navigate],
  );

  return {
    rows,
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    bookingFor,
    openQuotation,
    openBookingForm,
  };
}
