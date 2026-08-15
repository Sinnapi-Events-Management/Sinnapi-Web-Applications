import { formatDayLabel } from '../../messaging/format';
import type { NotificationDayGroup, NotificationView } from '../types';

/** Local-midnight `YYYY-MM-DD`, so grouping matches the reader's calendar day. */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Bucket a newest-first feed into calendar-day sections.
 *
 * Input order is preserved — the feed is already sorted by the query, so groups
 * come out newest-first without re-sorting. Rows with no usable timestamp fall
 * into a single trailing "Undated" section rather than being dropped.
 */
export function groupNotificationsByDay(rows: NotificationView[]): NotificationDayGroup[] {
  const groups: NotificationDayGroup[] = [];
  const index = new Map<string, NotificationDayGroup>();

  for (const row of rows) {
    const date = row.createdAt ? new Date(row.createdAt) : null;
    const valid = date && !Number.isNaN(date.getTime());
    const key = valid ? dayKey(date) : 'undated';
    let group = index.get(key);
    if (!group) {
      group = {
        key,
        label: valid ? formatDayLabel(row.createdAt) : 'Undated',
        items: [],
      };
      index.set(key, group);
      groups.push(group);
    }
    group.items.push(row);
  }

  return groups;
}
