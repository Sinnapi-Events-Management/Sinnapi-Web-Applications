import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBlockedDates } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

/**
 * The blocked-dates list, its removals, and the two day sets the month grid
 * draws. Adding a block is `useBlockDateForm`, which owns the form it collects.
 *
 * The split by `source` is the whole point of the grid: a manual block is the
 * vendor's own decision and can be lifted, a booking-derived one is a
 * consequence of a confirmed job and cannot. Both must be un-pickable, so they
 * are also handed back as one combined list.
 */
export function useCalendar(vendorId: string) {
  const qc = useQueryClient();
  const blocked = useBlockedDates(vendorId);
  const rows = useMemo(() => blocked.data ?? [], [blocked.data]);

  const days = useMemo(() => {
    const manual = rows.filter((r) => r.source === 'manual').map((r) => r.blocked_date);
    const booked = rows.filter((r) => r.source !== 'manual').map((r) => r.blocked_date);
    return { manual, booked, all: [...manual, ...booked] };
  }, [rows]);

  async function unblock(id: string) {
    await supabase.from('vendor_blocked_dates').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['v-blocked', vendorId] });
  }

  return { blocked, rows, days, unblock };
}
