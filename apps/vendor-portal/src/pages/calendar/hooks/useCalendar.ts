import { useQueryClient } from '@tanstack/react-query';
import { useBlockedDates } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

/**
 * The blocked-dates list and its removals. Adding a block is `useBlockDateForm`,
 * which owns the form it collects.
 */
export function useCalendar(vendorId: string) {
  const qc = useQueryClient();
  const blocked = useBlockedDates(vendorId);

  async function unblock(id: string) {
    await supabase.from('vendor_blocked_dates').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['v-blocked', vendorId] });
  }

  return { blocked, rows: blocked.data ?? [], unblock };
}
