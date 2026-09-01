import { useMemo } from 'react';
import { useEventRequirements } from '@/hooks/queries';
import type { EventRequirementModel } from '@/lib/types';

/**
 * The event's budget lines, split into the two groups the list renders.
 *
 * Cancelled lines are separated rather than dropped. A line the client called
 * off keeps whatever quotes and bookings were made against it, and those still
 * count against the budget — withdrawing a plan does not withdraw money already
 * promised. Hiding them would leave a client looking at a total they cannot
 * account for. They go below, collapsed, out of the way of the live plan.
 *
 * `unallocatedCount` is the nudge the section header uses: lines the client has
 * named without pricing. It is not a problem — planning starts that way — but
 * it is the reason a budget can look healthy while most of it is unaccounted
 * for, so the page says so rather than leaving it to be discovered.
 */
export function useRequirements(eventId: string) {
  const { data, isLoading, error } = useEventRequirements(eventId);

  return useMemo(() => {
    const rows = data ?? [];
    const live: EventRequirementModel[] = [];
    const cancelled: EventRequirementModel[] = [];

    for (const row of rows) (row.cancelled_at ? cancelled : live).push(row);

    return {
      rows,
      live,
      cancelled,
      isLoading,
      error,
      isEmpty: rows.length === 0,
      unallocatedCount: live.filter((r) => r.allocated_amount == null).length,
      /** Lines with nobody engaged yet — what the sourcing phase recommends into. */
      openCount: live.filter((r) => r.state === 'open').length,
    };
  }, [data, isLoading, error]);
}
