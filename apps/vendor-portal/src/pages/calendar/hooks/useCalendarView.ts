import { useCallback, useMemo, useState } from 'react';
import { startOfMonth, toIsoDate, parseIsoDate } from '@sinnapi/ui';
import { dayState, summariseMonth, type DayIndex, type DayState } from '../schema';
import type { BlockedDateModel } from '@/lib/types';

export type DaySelection = {
  date: string;
  state: DayState;
  /** Everything blocking that date — a booking, a manual block, or both. */
  rows: BlockedDateModel[];
};

/** `2026-08` — what two dates have to share to be the same month. */
function monthKey(date: Date): string {
  return toIsoDate(date).slice(0, 7);
}

/**
 * Which month the grid is showing and which day the panel is describing.
 *
 * Both are held here rather than inside the calendar because the page reads
 * them: the stat strip summarises *the visible month*, so an uncontrolled grid
 * that navigated on its own would leave the figures describing a month nobody
 * is looking at.
 *
 * Selecting a day carries the month with it. The grid shows trailing days from
 * the months either side, and clicking one of those on a controlled calendar
 * moves the selection without moving the view — which would leave the panel
 * describing September while the strip counted August.
 */
export function useCalendarView(index: DayIndex, today: string) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);

  const summary = useMemo(() => summariseMonth(month, index, today), [month, index, today]);

  const selection = useMemo<DaySelection>(
    () => ({
      date: selectedDate,
      state: dayState(selectedDate, index, today),
      rows: index.get(selectedDate) ?? [],
    }),
    [selectedDate, index, today],
  );

  /** Move both the panel and the grid to a date. The grid only moves if it must. */
  const goToDate = useCallback((date: string) => {
    const parsed = parseIsoDate(date);
    if (!parsed) return;
    setSelectedDate(date);
    // Guarded on the key, not on identity: `startOfMonth` returns a fresh Date
    // every call, so an unguarded set would re-render and re-derive the whole
    // month summary on every click inside the month already on screen.
    setMonth((current) =>
      monthKey(current) === date.slice(0, 7) ? current : startOfMonth(parsed),
    );
  }, []);

  const goToToday = useCallback(() => goToDate(today), [goToDate, today]);

  /** True while the grid is still on the month today sits in. */
  const isOnCurrentMonth = monthKey(month) === today.slice(0, 7);

  // The confirm dialog needs no date of its own — it always blocks whatever the
  // grid has selected, so one boolean is the whole of its state.
  const [blockOpen, setBlockOpen] = useState(false);
  const openBlockDialog = useCallback(() => setBlockOpen(true), []);
  const closeBlockDialog = useCallback(() => setBlockOpen(false), []);

  return {
    blockOpen,
    openBlockDialog,
    closeBlockDialog,
    month,
    setMonth,
    summary,
    selection,
    selectDate: goToDate,
    goToDate,
    goToToday,
    isOnCurrentMonth,
  };
}
