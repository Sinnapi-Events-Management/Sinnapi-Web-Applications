import type { StatusTabOption } from '@sinnapi/ui';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { PaymentAdminCounts } from '@/hooks/queries';
import { PAYMENT_STATUSES, type PaymentStatus } from '@/lib/status';
import { titleize } from '@/lib/config';

export type PaymentTabValue = StatusFilterValue<PaymentStatus>;

/**
 * The Payments list' tabs — `All` first, then the payment lifecycle in order —
 * hanging each status' count off the counts query. Counts stay `undefined`
 * until that query resolves so the tabs render immediately with badge
 * placeholders instead of a flash of zeros.
 */
export function getStatusTabs(counts?: PaymentAdminCounts): StatusTabOption<PaymentTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: counts?.all },
    ...PAYMENT_STATUSES.map((status) => ({
      value: status,
      label: titleize(status),
      count: counts?.[status],
    })),
  ];
}

const EMPTY_MESSAGES: Record<PaymentTabValue, string> = {
  [ALL_STATUSES]: 'No payments yet.',
  pending: 'No payments waiting on a checkout.',
  processing: 'No payments in flight.',
  succeeded: 'No successful payments.',
  failed: 'No failed payments.',
  refunded: 'No refunded payments.',
  partially_refunded: 'No partially refunded payments.',
};

/**
 * Empty-state copy for the current tab. When a search or filter is narrowing
 * the list, say so — a filtered-to-nothing table otherwise reads as "there are
 * no payments at all".
 */
export function getEmptyMessage(status: PaymentTabValue, filtered: boolean): string {
  if (filtered) return 'No payments match your search and filters.';
  return EMPTY_MESSAGES[status];
}
