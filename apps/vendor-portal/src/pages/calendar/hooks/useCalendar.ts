import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { todayIso } from '@sinnapi/ui';
import { useBlockedDates } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { buildDayIndex, firstOpenDate, groupByMonth, splitDays } from '../schema';
import { useCalendarView } from './useCalendarView';
import { useBlockedDateClients } from './useBlockedDateClients';

/** Cache entry every write on this page has to invalidate. */
export const blockedDatesKey = (vendorId: string) => ['v-blocked', vendorId];

/**
 * The whole calendar page's state: the one read behind it, the derivations the
 * four panels share, and the single write that lifts a block.
 *
 * The derivations live in `schema/calendarDays` and are memoised once here, so
 * the grid, the stat strip, the day panel and the agenda are all looking at the
 * same month — deriving each of them where it is rendered is how those four
 * end up disagreeing.
 *
 * Adding a block is `useBlockDateForm`, which owns the form it collects.
 */
export function useCalendar(vendorId: string) {
  const qc = useQueryClient();
  const blocked = useBlockedDates(vendorId);
  const rows = useMemo(() => blocked.data ?? [], [blocked.data]);

  // Resolved once per render rather than per helper call: two calls either side
  // of midnight would put the grid and the agenda on different days.
  const today = todayIso();

  const index = useMemo(() => buildDayIndex(rows), [rows]);
  const days = useMemo(() => splitDays(rows), [rows]);
  const groups = useMemo(() => groupByMonth(rows, today), [rows, today]);

  const view = useCalendarView(index, today);
  const { closeBlockDialog } = view;

  // Names for the tooltips the grid hangs on its marked days. Resolved here so
  // the one directory lookup covers every panel that needs a client's name.
  const clientName = useBlockedDateClients(rows);

  // Tracked by id, not a boolean: the agenda can show a dozen removable rows and
  // only the one being lifted should show it.
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // What the last write did, in the page's own words. Blocking a range can
  // legitimately write fewer days than it was given — days already taken are
  // left alone — and a dialog that just closed is the one place that cannot say
  // so, because it is gone by the time it would have.
  const [notice, setNotice] = useState<string | null>(null);

  const unblock = useCallback(
    async (id: string) => {
      setError(null);
      setNotice(null);
      setRemovingId(id);
      const { error: deleteError } = await supabase
        .from('vendor_blocked_dates')
        .delete()
        .eq('id', id);
      setRemovingId(null);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      qc.invalidateQueries({ queryKey: blockedDatesKey(vendorId) });
    },
    [qc, vendorId],
  );

  // Where the block dialog opens. The selected day when it can be blocked, the
  // next one that can when it cannot — the dialog is reachable from the rail's
  // own button, which assumes no particular day, and one seeded with a booked
  // date would open unable to do the only thing it is for.
  const blockSeedDate = useMemo(
    () => firstOpenDate(view.selection.date, index, today),
    [view.selection.date, index, today],
  );

  /** Closes the dialog and reports what it wrote. */
  const confirmBlocked = useCallback(
    (outcome: string) => {
      setError(null);
      setNotice(outcome);
      closeBlockDialog();
    },
    [closeBlockDialog],
  );

  return {
    blocked,
    rows,
    today,
    days,
    groups,
    index,
    clientName,
    unblock,
    removingId,
    error,
    dismissError: useCallback(() => setError(null), []),
    blockSeedDate,
    notice,
    dismissNotice: useCallback(() => setNotice(null), []),
    confirmBlocked,
    ...view,
  };
}

export type CalendarController = ReturnType<typeof useCalendar>;
