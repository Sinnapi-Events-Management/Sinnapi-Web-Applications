import { useMemo, useState } from 'react';
import { useEventVendors } from '@/hooks/queries';
import type { EventVendorModel } from '@/lib/types';

export const VENDOR_FILTERS = ['all', 'shortlisted', 'quoted', 'waiting', 'passed'] as const;
export type VendorFilter = (typeof VENDOR_FILTERS)[number];

/**
 * Which engagement belongs under which filter.
 *
 * The filters are named for what the CLIENT has to do about each, not for the
 * database column they read. "Waiting" spans an invited vendor who has not
 * answered and an interested one who has not priced anything — two different
 * rows in `event_interests`, one situation for the person looking at the
 * screen: somebody owes them a response.
 */
function matches(row: EventVendorModel, filter: VendorFilter): boolean {
  const passed = row.interest_status === 'declined' || row.interest_status === 'withdrawn';
  const quoted = ['sent', 'revised', 'accepted'].includes(row.quotation_status ?? '');

  switch (filter) {
    case 'shortlisted':
      return row.interest_status === 'shortlisted' && !passed;
    case 'quoted':
      return quoted && !passed;
    case 'waiting':
      return !passed && !quoted;
    case 'passed':
      return passed;
    default:
      return true;
  }
}

/**
 * The vendor board: everyone in the running, filtered and counted.
 *
 * Counting happens over the whole set rather than the filtered one, so the tab
 * badges say how many rows each filter WOULD show — a count that changed as you
 * switched tabs would be describing the view rather than the event.
 *
 * Filtering client-side is deliberate: the whole set is one small read (see
 * `useEventVendors`), and going to the server for each tab would trade an
 * instant switch for a spinner on data already in memory.
 */
export function useEventVendorBoard(eventId: string) {
  const { data, isLoading, error } = useEventVendors(eventId);
  const [filter, setFilter] = useState<VendorFilter>('all');

  const rows = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    const out = {} as Record<VendorFilter, number>;
    for (const f of VENDOR_FILTERS) out[f] = rows.filter((r) => matches(r, f)).length;
    return out;
  }, [rows]);

  const visible = useMemo(() => rows.filter((r) => matches(r, filter)), [rows, filter]);

  return {
    rows,
    visible,
    counts,
    filter,
    setFilter,
    isLoading,
    error,
    isEmpty: rows.length === 0,
  };
}
