import type { StatusTabOption } from '@/components/ui/StatusTabs';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { EventAdminCounts } from '@/hooks/queries';
import { EVENT_STATUSES, type EventStatus } from '@/lib/status';
import { titleize } from '@/lib/config';

export type EventTabValue = StatusFilterValue<EventStatus>;

/**
 * Build the Events list' tabs — `All` first, then the event lifecycle in
 * order — hanging each status' count off the counts query. Counts stay
 * `undefined` until that query resolves so the tabs render immediately with
 * badge placeholders instead of a flash of zeros.
 */
export function getStatusTabs(counts?: EventAdminCounts): StatusTabOption<EventTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: counts?.all },
    ...EVENT_STATUSES.map((status) => ({
      value: status,
      label: titleize(status),
      count: counts?.[status],
    })),
  ];
}

// Baseline "nothing here" copy per tab, used when no search/filter is active.
const EMPTY_MESSAGES: Record<EventTabValue, string> = {
  [ALL_STATUSES]: 'No events yet.',
  draft: 'No draft events.',
  published: 'No published events.',
  closed: 'No closed events.',
  archived: 'No archived events.',
};

/**
 * Empty-state copy for the current tab. When a search or filter is narrowing
 * the list, say so — otherwise a filtered-to-nothing table reads as "there are
 * no events at all", which is misleading.
 */
export function getEmptyMessage(status: EventTabValue, filtered: boolean): string {
  if (filtered) return 'No events match your search and filters.';
  return EMPTY_MESSAGES[status];
}
