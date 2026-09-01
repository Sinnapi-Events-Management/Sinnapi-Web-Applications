import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMediaQuery, useTheme } from '@sinnapi/ui';
import { countAgenda, filterAgenda, type AgendaFilter, type MonthGroup } from '../schema';

/** The two things the rail can be showing. */
export type RailTab = 'day' | 'upcoming';

type Options = {
  /** Every upcoming unavailable day, already grouped by month. */
  groups: MonthGroup[];
  /** Moves the grid and the day panel to a date. From `useCalendarView`. */
  selectDate: (date: string) => void;
  /** Opens the block dialog. From `useCalendarView`. */
  openBlockDialog: () => void;
};

/**
 * How the calendar's second column behaves — which of its two readings is on
 * screen, and what a tap on a date does to it.
 *
 * The page asks two different questions and they do not fit in one panel. "What
 * is on the 18th?" is answered by the day; "when am I next away?" is answered
 * by the months ahead, and no month grid can answer it because the next block is
 * as likely to be in November. Tabbing them is what keeps the second from being
 * pushed a screenful below the first, where the vendor never scrolled to it.
 *
 * The breakpoint is read here rather than in the layout because it changes
 * *behaviour*, not just widths: with no room for a rail, the day has to arrive
 * as a sheet over the grid, and that is a different response to the same tap.
 */
export function useCalendarRail({ groups, selectDate, openBlockDialog }: Options) {
  const theme = useTheme();
  // The same breakpoint the layout splits on, so the rail and the sheet can
  // never both be the answer — or neither.
  const isCompact = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<RailTab>('day');
  const [filter, setFilter] = useState<AgendaFilter>('all');
  const [dayOpen, setDayOpen] = useState(false);

  const counts = useMemo(() => countAgenda(groups), [groups]);
  const visibleGroups = useMemo(() => filterAgenda(groups, filter), [groups, filter]);

  /**
   * A date was chosen — on the grid, or on a row of the agenda.
   *
   * Both mean "show me this day", so both land the same way: the selection
   * moves, and whichever surface describes a day comes forward. Picking from
   * the agenda deliberately leaves the list: it is the same selection seen two
   * ways, not two lists that happen to share a page.
   */
  const pickDate = useCallback(
    (date: string) => {
      selectDate(date);
      setTab('day');
      if (isCompact) setDayOpen(true);
    },
    [selectDate, isCompact],
  );

  const closeDay = useCallback(() => setDayOpen(false), []);

  /**
   * Blocking was asked for — from the day, or from the agenda.
   *
   * The sheet stands down first. On a narrow screen the request comes from
   * inside it, and a dialog opening over an open sheet stacks two backdrops and
   * hides the confirmation that follows behind both of them.
   */
  const requestBlock = useCallback(() => {
    setDayOpen(false);
    openBlockDialog();
  }, [openBlockDialog]);

  // A sheet is the compact answer only. Widening the window puts the day back in
  // the rail, and an overlay left open on top of it would be covering the very
  // panel that now holds the same thing.
  useEffect(() => {
    if (!isCompact) setDayOpen(false);
  }, [isCompact]);

  return {
    isCompact,
    tab,
    setTab,
    filter,
    setFilter,
    counts,
    /** The agenda as the current filter leaves it. */
    groups: visibleGroups,
    pickDate,
    dayOpen,
    closeDay,
    requestBlock,
  };
}

export type CalendarRailController = ReturnType<typeof useCalendarRail>;
