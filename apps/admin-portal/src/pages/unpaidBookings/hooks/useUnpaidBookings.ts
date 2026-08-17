import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTableState } from '@sinnapi/ui';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import {
  useUnpaidBookingCounts,
  useUnpaidBookings as useUnpaidBookingsQuery,
  type UnpaidBookingParams,
  type UnpaidBookingState,
} from '@/hooks/queries';
import { usePaymentChase } from '@/hooks/usePaymentChase';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { supabase } from '@/lib/supabase';
import { getEmptyMessage, getStateTabs } from '../schema';

/**
 * The unpaid-bookings queue: server-side search, a state tab, sorting and
 * pagination, plus the three chase actions.
 *
 * Subscribed rather than polled, and for a sharper reason than most consoles:
 * this queue is worked by people while a cron is editing the same rows
 * underneath them. The sweep flags bookings overdue and sends reminders every
 * fifteen minutes, and a payment webhook can settle one at any moment — so a
 * stale table is not merely out of date, it is a table offering an operator a
 * cancel button on a booking that was paid while they were reading it. The
 * server refuses that write, but the better outcome is not offering it.
 *
 * A thin coordinator: search, table state and the chase writes each own their
 * state elsewhere.
 */
export function useUnpaidBookings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const table = useTableState({ sort: { field: 'effective_due_at', direction: 'asc' } });
  const { onPageChange } = table.controls;

  // Any change to the query re-queries from page 1 — a later page rarely
  // survives the result set shrinking, which would strand the operator on an
  // empty table.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  // Overdue first: it is the only tab with a decision attached, so it is the
  // one an operator opening this page should already be looking at.
  const [state, setStateRaw] = useState<UnpaidBookingState>('overdue');
  const setState = useCallback(
    (next: UnpaidBookingState) => {
      setStateRaw(next);
      resetPage();
    },
    [resetPage],
  );

  const search = useSearchTerm({ onChange: resetPage });
  const chase = usePaymentChase();

  const params = useMemo<UnpaidBookingParams>(
    () => ({ ...table.params, search: search.query, state }),
    [table.params, search.query, state],
  );

  const { data, isLoading, isFetching, error } = useUnpaidBookingsQuery(params);
  const { data: counts, isLoading: countsLoading } = useUnpaidBookingCounts();

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin-unpaid-bookings'] });
  }, [qc]);

  useRealtimeRefresh({
    client: supabase,
    channel: 'admin-unpaid-bookings',
    onChange: refresh,
    watch: UNPAID_WATCH,
  });

  const tabs = useMemo(() => getStateTabs(counts), [counts]);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    emptyMessage: getEmptyMessage(state, Boolean(search.query)),
    tabs,
    tab: state,
    onTabChange: setState,
    countsLoading,
    counts,
    search,
    chase,
    table,
    /** Row click target. The queue triages; the booking page is where context lives. */
    viewBooking: useCallback((id: string) => navigate(`/bookings/${id}`), [navigate]),
  };
}

// Module-level so the identity is stable across renders. Bookings carry the
// deadline and the overdue flag; escrows carry whether a checkout was opened
// and whether the money landed.
const UNPAID_WATCH = [{ table: 'bookings' }, { table: 'escrow_transactions' }];
