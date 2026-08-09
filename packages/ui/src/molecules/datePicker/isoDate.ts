/**
 * Calendar-date helpers for the picker family.
 *
 * Pure data — no React, no MUI, no date library. Every date the product stores
 * (`event_date`, `blocked_date`, `starts_at`…) is a *calendar* date, not an
 * instant, so the whole picker speaks `YYYY-MM-DD` strings and only converts to
 * `Date` for the few days the calendar grid has to render.
 *
 * The conversion is deliberately hand-rolled rather than `new Date(iso)`:
 * `new Date('2026-08-12')` is parsed as UTC midnight, which renders as the 11th
 * for anyone west of Greenwich. Building the date from its parts pins it to
 * local midnight, so the day the user taps is the day that gets stored.
 */

/** An ISO calendar date, `YYYY-MM-DD`. The empty string means "not set". */
export type IsoDate = string;

/** Both ends of a range. Either end may be `''` while the user is mid-selection. */
export type IsoDateRange = { from: IsoDate; to: IsoDate };

export const EMPTY_RANGE: IsoDateRange = { from: '', to: '' };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a well-formed *and* real date — rejects `2026-02-31`. */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const date = parseIsoDate(value);
  return date !== null && toIsoDate(date) === value;
}

/** `YYYY-MM-DD` → local-midnight `Date`, or `null` when it isn't a date. */
export function parseIsoDate(value: IsoDate | null | undefined): Date | null {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // Rolls over for impossible days (Feb 31 → Mar 3), which the round-trip catches.
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `Date` → `YYYY-MM-DD` using local parts, never `toISOString()`. */
export function toIsoDate(date: Date | null | undefined): IsoDate {
  if (!date || Number.isNaN(date.getTime())) return '';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today, as the user's calendar sees it. */
export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

/** Local midnight today — the anchor for `disablePast` and the "Today" preset. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** `days` later (or earlier, when negative). Never mutates its argument. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Ordering that ignores any time component the argument may carry. */
export function compareIso(a: IsoDate, b: IsoDate): number {
  // ISO dates are lexicographically ordered, so string compare is enough.
  return a === b ? 0 : a < b ? -1 : 1;
}

/** Swaps the ends when the user picked them backwards. */
export function normalizeRange(range: IsoDateRange): IsoDateRange {
  const { from, to } = range;
  if (from && to && compareIso(from, to) > 0) return { from: to, to: from };
  return range;
}
