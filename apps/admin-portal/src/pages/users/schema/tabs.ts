import type { StatusTabOption } from '@/components/ui/StatusTabs';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { UserStatusCounts } from '@/hooks/queries';
import { PROFILE_STATUSES, type ProfileStatus } from '@/lib/status';
import { titleize } from '@/lib/config';

export type UserTabValue = StatusFilterValue<ProfileStatus>;

/**
 * Build the Users list' tabs — `All` first, then the profile lifecycle in order
 * — hanging each status' count off the counts query. Counts stay `undefined`
 * until that query resolves so the tabs render immediately with badge
 * placeholders instead of a flash of zeros.
 */
export function getStatusTabs(counts?: UserStatusCounts): StatusTabOption<UserTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: counts?.all },
    ...PROFILE_STATUSES.map((status) => ({
      value: status,
      label: titleize(status),
      count: counts?.[status],
    })),
  ];
}

// Baseline "nothing here" copy per tab, used when no search is active.
const EMPTY_MESSAGES: Record<UserTabValue, string> = {
  [ALL_STATUSES]: 'No staff users yet.',
  active: 'No active staff users.',
  suspended: 'No suspended staff users.',
  pending: 'No pending staff users.',
};

/**
 * Empty-state copy for the current tab. When a search is narrowing the list, say
 * so — otherwise a searched-to-nothing table reads as "there are no users at
 * all", which is misleading.
 */
export function getEmptyMessage(status: UserTabValue, filtered: boolean): string {
  if (filtered) return 'No staff users match your search.';
  return EMPTY_MESSAGES[status];
}
