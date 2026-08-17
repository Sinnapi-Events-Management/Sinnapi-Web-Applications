/**
 * Date and timestamp formatting for the shared detail surfaces.
 *
 * Pure data (no React/MUI) for the same reason `money.ts` is: the quotation
 * behind a booking is shown to the client, the vendor and an operator at once,
 * and a "sent" date that reads `12 Aug 2026` on one screen and `8/12/2026` on
 * another is not a formatting difference — it is two people quoting different
 * dates at each other in a dispute.
 *
 * `en-GB` is pinned rather than taken from the browser, matching the pickers in
 * `datePicker/formatDate`: day-month-year with a named month is unambiguous
 * everywhere Sinnapi operates, and `12/08/2026` is not.
 *
 * These take a raw stored value — a `date` (`2026-08-12`) or a `timestamptz` —
 * which is what separates them from `formatIsoDate`: that one speaks the
 * picker's calendar-date dialect and returns `''` for anything else.
 */

const LOCALE = 'en-GB';

const DAY = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const TIMESTAMP = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * A stored date as a `Date`, or null when there is nothing to read.
 *
 * A bare `YYYY-MM-DD` is parsed from its parts rather than by `new Date()`:
 * the platform reads that form as UTC midnight, which renders as the previous
 * day for anyone west of Greenwich — so a quote valid until the 12th would
 * display as the 11th. Timestamps carry their own zone and are left alone.
 */
function parse(value: string | null | undefined): Date | null {
  if (!value) return null;

  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = calendarDate
    ? new Date(Number(calendarDate[1]), Number(calendarDate[2]) - 1, Number(calendarDate[3]))
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** `2026-08-12` → `12 Aug 2026`. Nothing stored renders as an em dash. */
export function formatDay(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DAY.format(date) : '—';
}

/** `2026-08-12T09:30:00Z` → `12 Aug 2026, 09:30`. Nothing stored renders as an em dash. */
export function formatTimestamp(value: string | null | undefined): string {
  const date = parse(value);
  return date ? TIMESTAMP.format(date) : '—';
}
