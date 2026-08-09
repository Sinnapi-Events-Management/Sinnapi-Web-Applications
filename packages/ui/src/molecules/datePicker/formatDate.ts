/**
 * How a chosen date reads back to the user.
 *
 * `12 Aug 2026` rather than `2026-08-12`: the stored format is unambiguous for
 * machines and unreadable at a glance, and `12/08/2026` is ambiguous across
 * locales. Day-month-year with a named month is both short and unmistakable.
 *
 * `en-GB` is pinned rather than taken from the browser so the trigger text can
 * never disagree with the calendar grid beside it.
 */
import { parseIsoDate, type IsoDate, type IsoDateRange } from './isoDate';

const LOCALE = 'en-GB';

const dayMonthYear = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const dayOnly = new Intl.DateTimeFormat(LOCALE, { day: 'numeric' });
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
const weekdayLong = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** `2026-08-12` → `12 Aug 2026`. Unparseable input formats as `''`. */
export function formatIsoDate(value: IsoDate): string {
  const date = parseIsoDate(value);
  return date ? dayMonthYear.format(date) : '';
}

/** The long form used for screen readers and tooltips: `Wednesday, 12 August 2026`. */
export function formatIsoDateLong(value: IsoDate): string {
  const date = parseIsoDate(value);
  return date ? weekdayLong.format(date) : '';
}

/** `August 2026` — the calendar's month caption. */
export function formatMonthCaption(date: Date): string {
  return monthYear.format(date);
}

/**
 * A range in as few words as it can be said without losing information:
 * same month → `12 – 20 Aug 2026`, same year → `12 Aug – 3 Sep 2026`,
 * otherwise both years. A half-picked range reads as an open bound.
 */
export function formatIsoRange(range: IsoDateRange): string {
  const from = parseIsoDate(range.from);
  const to = parseIsoDate(range.to);

  if (!from && !to) return '';
  if (from && !to) return `From ${dayMonthYear.format(from)}`;
  if (!from && to) return `Until ${dayMonthYear.format(to)}`;

  // Both ends present from here.
  const start = from as Date;
  const end = to as Date;
  if (start.getTime() === end.getTime()) return dayMonthYear.format(start);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) return `${dayOnly.format(start)} – ${dayMonthYear.format(end)}`;
  if (sameYear) return `${dayMonth.format(start)} – ${dayMonthYear.format(end)}`;
  return `${dayMonthYear.format(start)} – ${dayMonthYear.format(end)}`;
}
