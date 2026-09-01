/**
 * How a list of blocked-date rows becomes a month a vendor can read.
 *
 * Pure data, no React: the calendar grid, the stat strip, the day panel and the
 * agenda all answer questions about the *same* rows, and deriving each of them
 * separately inside a component is how the four end up disagreeing about what
 * "this month" contains.
 *
 * The vocabulary throughout is the table's own `source`: `manual` is the
 * vendor's own decision and can be lifted, anything else came from a confirmed
 * booking and cannot.
 */
import {
  addDays,
  compareIso,
  formatIsoDate,
  formatMonthCaption,
  parseIsoDate,
  toIsoDate,
} from '@sinnapi/ui';
import type { BlockedDateModel } from '@/lib/types';

/** What one day on the grid is. `past` outranks the rest — a gone day is moot. */
export type DayState = 'past' | 'booked' | 'blocked' | 'open';

/** Every blocked row landing on one date, keyed by `YYYY-MM-DD`. */
export type DayIndex = Map<string, BlockedDateModel[]>;

export type MonthSummary = {
  /** `August 2026` — the caption the strip and the grid must agree on. */
  label: string;
  booked: number;
  blocked: number;
  /** Days left in the month that nothing has claimed. Excludes days already gone. */
  open: number;
};

export type MonthGroup = {
  /** `2026-08` — stable key for the list. */
  key: string;
  label: string;
  rows: BlockedDateModel[];
};

/** True for a row a confirmed booking inserted, which this page cannot remove. */
export function isBookingBlock(row: BlockedDateModel): boolean {
  return row.source !== 'manual';
}

/** All rows for a date, in one lookup. A date can carry both a manual block and a booking. */
export function buildDayIndex(rows: BlockedDateModel[]): DayIndex {
  const index: DayIndex = new Map();
  for (const row of rows) {
    const existing = index.get(row.blocked_date);
    if (existing) existing.push(row);
    else index.set(row.blocked_date, [row]);
  }
  return index;
}

/**
 * The two marker sets the grid draws.
 *
 * A booking outranks a manual block on the same day: the vendor cannot lift it,
 * so telling them it is their own choice would be a lie. Kept as one `all` list
 * too, because whichever way a day is spoken for it is un-pickable.
 */
export function splitDays(rows: BlockedDateModel[]): {
  manual: string[];
  booked: string[];
  all: string[];
} {
  const booked = new Set<string>();
  const manual = new Set<string>();
  for (const row of rows) {
    if (isBookingBlock(row)) booked.add(row.blocked_date);
    else manual.add(row.blocked_date);
  }
  for (const date of booked) manual.delete(date);
  return {
    manual: [...manual],
    booked: [...booked],
    all: [...new Set(rows.map((r) => r.blocked_date))],
  };
}

/** What a single date is, given everything blocking it and where today falls. */
export function dayState(date: string, index: DayIndex, today: string): DayState {
  if (compareIso(date, today) < 0) return 'past';
  const rows = index.get(date);
  if (!rows?.length) return 'open';
  return rows.some(isBookingBlock) ? 'booked' : 'blocked';
}

/**
 * The month's headline figures.
 *
 * `open` counts only days still to come, so a month that is three-quarters gone
 * doesn't report a fortnight of availability that cannot be sold.
 */
export function summariseMonth(month: Date, index: DayIndex, today: string): MonthSummary {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();

  let booked = 0;
  let blocked = 0;
  let open = 0;

  for (let day = 1; day <= dayCount; day += 1) {
    const state = dayState(toIsoDate(new Date(year, monthIndex, day)), index, today);
    if (state === 'booked') booked += 1;
    else if (state === 'blocked') blocked += 1;
    else if (state === 'open') open += 1;
  }

  return { label: formatMonthCaption(month), booked, blocked, open };
}

/**
 * The first day on or after `from` that nothing has claimed.
 *
 * What the block dialog opens on. It is reachable from a day the vendor tapped
 * *and* from a button that assumes no day at all, and the second of those can
 * land on a date that is past, booked or already blocked — a dialog seeded with
 * one of those opens already unable to do the only thing it is for.
 *
 * Bounded rather than open-ended: a vendor booked solid for a year should get
 * the dialog with a date they must change, not a hung loop.
 */
export function firstOpenDate(from: string, index: DayIndex, today: string, limit = 366): string {
  const start = compareIso(from, today) < 0 ? today : from;
  let cursor = parseIsoDate(start);
  for (let step = 0; cursor && step < limit; step += 1) {
    const iso = toIsoDate(cursor);
    if (dayState(iso, index, today) === 'open') return iso;
    cursor = addDays(cursor, 1);
  }
  return start;
}

/**
 * The agenda: unavailable days from today forward, grouped by the month they
 * fall in.
 *
 * Past blocks are dropped rather than shown greyed — this list exists to be
 * acted on, and there is no action left on a date that has been and gone.
 */
export function groupByMonth(rows: BlockedDateModel[], today: string): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const row of rows) {
    if (compareIso(row.blocked_date, today) < 0) continue;
    const key = row.blocked_date.slice(0, 7);
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    const [year, month] = key.split('-').map(Number);
    groups.set(key, { key, label: formatMonthCaption(new Date(year, month - 1, 1)), rows: [row] });
  }

  // The query already sorts by date, so both the groups and their rows are in
  // order by construction — sorting the keys is only insurance against that
  // changing upstream.
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * `14:00:00` → `14:00`, and a pair of them into `14:00 – 18:00`.
 *
 * Postgres hands back `time` with seconds nobody set and nobody reads. A
 * booking may carry a start with no end — the client is asked for both but only
 * owes the first — so an open-ended window says so rather than inventing a
 * finish time.
 */
export function formatTimeRange(start: string | null, end: string | null): string | null {
  const trim = (value: string | null) => (value ? value.slice(0, 5) : null);
  const from = trim(start);
  const to = trim(end);
  if (!from) return null;
  return to ? `${from} – ${to}` : `From ${from}`;
}

/** All the client ids behind a set of booking-derived blocks, deduped. */
export function bookingClientIds(rows: BlockedDateModel[]): string[] {
  return [
    ...new Set(
      rows
        .filter(isBookingBlock)
        .map((row) => row.bookings?.client_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

/** How one blocked row reads in a list: what it is, and the detail under it. */
export function describeBlock(row: BlockedDateModel): { title: string; detail: string | null } {
  if (!isBookingBlock(row)) {
    return { title: formatIsoDate(row.blocked_date), detail: row.reason };
  }
  const reference = row.bookings?.reference_no;
  return {
    title: formatIsoDate(row.blocked_date),
    detail: reference ? `Confirmed booking · ${reference}` : 'Confirmed booking',
  };
}
