import type { StatusTabOption } from '@/components/ui/StatusTabs';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { SubscriptionAdminCounts } from '@/hooks/queries';
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@/lib/status';
import { titleize } from '@/lib/config';

export type SubscriptionTabValue = StatusFilterValue<SubscriptionStatus>;

/**
 * Build the Subscriptions list' tabs — `All` first, then the subscription
 * lifecycle in order — hanging each status' count off the counts query. Counts
 * stay `undefined` until that query resolves so the tabs render immediately with
 * badge placeholders instead of a flash of zeros.
 */
export function getStatusTabs(
  counts?: SubscriptionAdminCounts,
): StatusTabOption<SubscriptionTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: counts?.all },
    ...SUBSCRIPTION_STATUSES.map((status) => ({
      value: status,
      label: titleize(status),
      count: counts?.[status],
    })),
  ];
}

// Baseline "nothing here" copy per tab, used when no search/filter is active.
const EMPTY_MESSAGES: Record<SubscriptionTabValue, string> = {
  [ALL_STATUSES]: 'No subscriptions yet.',
  trialing: 'No subscriptions on trial.',
  active: 'No active subscriptions.',
  past_due: 'No past-due subscriptions.',
  grace: 'No subscriptions in grace.',
  suspended: 'No suspended subscriptions.',
  expired: 'No expired subscriptions.',
  cancelled: 'No cancelled subscriptions.',
};

/**
 * Empty-state copy for the current tab. When a search or filter is narrowing the
 * list, say so — otherwise a filtered-to-nothing table reads as "there are no
 * subscriptions at all", which is misleading.
 */
export function getEmptyMessage(status: SubscriptionTabValue, filtered: boolean): string {
  if (filtered) return 'No subscriptions match your search and filters.';
  return EMPTY_MESSAGES[status];
}
