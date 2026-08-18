/**
 * Formatting for the messaging kit.
 *
 * Duplicated in spirit from each portal's `lib/config`, and deliberately not
 * imported from one: `@sinnapi/ui` has no dependency on any app, and a package
 * that reached into `@/lib` would only work in whichever portal was built last.
 * The set here is small and messaging-specific — the calendar-aware day label
 * and the clock time on a bubble have no counterpart in the portals' helpers.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * DAY],
  ['month', 30 * DAY],
  ['day', DAY],
  ['hour', HOUR],
  ['minute', MINUTE],
];

/** Short relative stamp for inbox rows: "Just now", "5 min ago", "3 days ago". */
export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '';
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return '';
  const seconds = Math.round((Date.now() - ms) / 1000);
  if (seconds < MINUTE) return 'Just now';
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });
  for (const [unit, per] of RELATIVE_UNITS) {
    if (seconds >= per) return rtf.format(-Math.floor(seconds / per), unit);
  }
  return 'Just now';
}

/** Clock time under a bubble — "14:32". Never a date; the day divider owns that. */
export function formatClockTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Calendar-aware divider label. "Today" and "Yesterday" carry more meaning than
 * a date the reader has to convert, and a thread's most-read region is always
 * its last two days. Anything older gets a real date, with the year dropped
 * inside the current one because it is noise there.
 */
export function formatDayLabel(value: string | null | undefined): string {
  if (!value) return 'Unknown date';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown date';

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(d)) / (DAY * 1000));

  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  // Inside a week the weekday alone is unambiguous and reads faster.
  if (daysAgo > 1 && daysAgo < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });

  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** Initials for an avatar: "Bella Events" → "BE". */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** snake_case enum → "Snake Case", for values with no explicit label. */
export function titleizeToken(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human file size for an attachment chip. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // One decimal below 10 keeps "1.4 MB" from collapsing to a misleading "1 MB".
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/**
 * Groups messages under the calendar day they were sent, preserving order.
 * Exported because both the thread and its skeleton need the same shape.
 */
export function groupMessagesByDay<T extends { createdAt: string | null }>(
  messages: T[],
): { key: string; label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const m of messages) {
    const key = m.createdAt ? new Date(m.createdAt).toDateString() : 'unknown';
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(m);
    else groups.push({ key, label: formatDayLabel(m.createdAt), items: [m] });
  }
  return groups;
}
