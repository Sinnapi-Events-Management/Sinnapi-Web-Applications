import type { StatusTabOption } from '@/components/ui/StatusTabs';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { UserStatusCounts } from '@/hooks/queries';
import { PROFILE_STATUSES, type ProfileStatus } from '@/lib/status';
import { titleize } from '@/lib/config';

export type ClientTabValue = StatusFilterValue<ProfileStatus>;

/** `All` first, then the profile lifecycle, each with its live count badge. */
export function getStatusTabs(counts?: UserStatusCounts): StatusTabOption<ClientTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: counts?.all },
    ...PROFILE_STATUSES.map((status) => ({
      value: status,
      label: titleize(status),
      count: counts?.[status],
    })),
  ];
}

const EMPTY_MESSAGES: Record<ClientTabValue, string> = {
  [ALL_STATUSES]: 'No clients yet.',
  active: 'No active clients.',
  suspended: 'No suspended clients.',
  pending: 'No pending clients.',
};

export function getEmptyMessage(status: ClientTabValue, filtered: boolean): string {
  if (filtered) return 'No clients match your search.';
  return EMPTY_MESSAGES[status];
}
