/**
 * What a vendor's closed days mean to somebody deciding whether to ask.
 *
 * Pure data, no React: the grid tints a day, the strip counts it, the callout
 * points at the next free one and the notice explains a taken one — four
 * surfaces answering questions about the *same* set of dates, and deriving each
 * of them inside its own component is how the four end up disagreeing about
 * whether the 18th is free.
 *
 * The vocabulary here is deliberately poorer than the vendor portal's. That page
 * separates `booked` from `blocked` because a vendor can lift one and not the
 * other; a client can lift neither, and telling them which of their prospect's
 * closed days are other people's weddings is nobody's business but the vendor's.
 * Everything closed is simply `unavailable`.
 */
import { addDays, compareIso, formatMonthCaption, parseIsoDate, toIsoDate } from '@sinnapi/ui';

/** How far ahead the next-open search will look before admitting defeat. */
const SEARCH_LIMIT_DAYS = 366;

/** What one day on the grid is, from a client's side of it. */
export type AvailabilityDayState = 'past' | 'unavailable' | 'open';

/** The vendor's closed dates as a lookup rather than a list to scan. */
export type ClosedDays = ReadonlySet<string>;

export type MonthAvailability = {
  /** `September 2026` — the caption the strip and the grid must agree on. */
  label: string;
  /** Days still to come in this month that nothing has claimed. */
  open: number;
  /** Days still to come in this month the vendor has closed. */
  unavailable: number;
  /** True when the month has days left and every one of them is spoken for. */
  fullyBooked: boolean;
};

/** Every closed date, as the `Set` the rest of this module wants. */
export function toClosedDays(dates: readonly string[]): ClosedDays {
  return new Set(dates);
}

/** What a single date is, given the closed set and where today falls. */
export function dayState(date: string, closed: ClosedDays, today: string): AvailabilityDayState {
  if (compareIso(date, today) < 0) return 'past';
  return closed.has(date) ? 'unavailable' : 'open';
}

/**
 * The visible month in two numbers.
 *
 * Both counts exclude days already gone, so a month three-quarters through
 * doesn't advertise a fortnight of availability nobody can book. That also means
 * `open + unavailable` is the days *remaining*, not the length of the month —
 * which is the figure a client is actually weighing.
 */
export function summariseMonth(month: Date, closed: ClosedDays, today: string): MonthAvailability {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();

  let open = 0;
  let unavailable = 0;

  for (let day = 1; day <= dayCount; day += 1) {
    const state = dayState(toIsoDate(new Date(year, monthIndex, day)), closed, today);
    if (state === 'open') open += 1;
    else if (state === 'unavailable') unavailable += 1;
  }

  return {
    label: formatMonthCaption(month),
    open,
    unavailable,
    fullyBooked: open === 0 && unavailable > 0,
  };
}

/**
 * The first day on or after `from` that the vendor has not closed.
 *
 * The single most useful thing this page can tell somebody whose date is gone.
 * A calendar that only says "no" leaves them clicking through months to find a
 * "yes", and that hunt is where booking flows lose people — so the page answers
 * the follow-up question before it is asked.
 *
 * Bounded rather than open-ended: a vendor booked solid for a year should get an
 * honest `null` and a suggestion to message them, not a hung loop.
 */
export function findNextOpenDate(
  closed: ClosedDays,
  from: string,
  limit = SEARCH_LIMIT_DAYS,
): string | null {
  let cursor = parseIsoDate(from);
  for (let step = 0; cursor && step < limit; step += 1) {
    const iso = toIsoDate(cursor);
    if (dayState(iso, closed, from) === 'open') return iso;
    cursor = addDays(cursor, 1);
  }
  return null;
}

/** True when two dates fall in the same calendar month. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
