import { formatDate } from '@/lib/config';

export type DayGroup<T> = {
  /** `YYYY-MM-DD` in local time, or `undated` for rows with no timestamp. */
  key: string;
  /** "Today", "Yesterday", else an absolute date. */
  label: string;
  items: T[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local-midnight `YYYY-MM-DD`, so grouping matches the admin's calendar day. */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayLabel(d: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfRow = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfRow) / DAY_MS);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(d.toISOString());
}

/**
 * Bucket a newest-first list into calendar-day sections for a dated feed.
 * Generic over the row so it stays independent of the notification view model.
 *
 * Input order is preserved — the feed is already sorted by the query, so groups
 * come out newest-first without re-sorting.
 */
export function groupByDay<T extends { createdAt: string | null }>(rows: T[]): DayGroup<T>[] {
  const now = new Date();
  const groups: DayGroup<T>[] = [];
  const index = new Map<string, DayGroup<T>>();

  for (const row of rows) {
    const date = row.createdAt ? new Date(row.createdAt) : null;
    const valid = date && !Number.isNaN(date.getTime());
    const key = valid ? dayKey(date) : 'undated';
    let group = index.get(key);
    if (!group) {
      group = { key, label: valid ? dayLabel(date, now) : 'Undated', items: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.items.push(row);
  }

  return groups;
}
