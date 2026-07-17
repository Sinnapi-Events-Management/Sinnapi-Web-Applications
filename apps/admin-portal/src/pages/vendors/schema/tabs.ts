import type { StatusTabOption } from '@/components/ui/StatusTabs';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { VendorAdminCounts } from '@/hooks/queries';
import { VENDOR_STATUSES, type VendorAdminStatus } from '@/lib/status';
import { titleize } from '@/lib/config';

export type VendorTabValue = StatusFilterValue<VendorAdminStatus>;

/**
 * Build the Vendors list' tabs — `All` first, then the vendor lifecycle in
 * order — hanging each status' count off the counts query. Counts stay
 * `undefined` until that query resolves so the tabs render immediately with
 * badge placeholders instead of a flash of zeros.
 */
export function getStatusTabs(counts?: VendorAdminCounts): StatusTabOption<VendorTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: counts?.all },
    ...VENDOR_STATUSES.map((status) => ({
      value: status,
      label: titleize(status),
      count: counts?.[status],
    })),
  ];
}

// Baseline "nothing here" copy per tab, used when no search/filter is active.
const EMPTY_MESSAGES: Record<VendorTabValue, string> = {
  [ALL_STATUSES]: 'No vendors yet.',
  active: 'No active vendors yet.',
  suspended: 'No suspended vendors.',
  hidden: 'No hidden vendors.',
};

/**
 * Empty-state copy for the current tab. When a search or filter is narrowing
 * the list, say so — otherwise a filtered-to-nothing table reads as "there are
 * no vendors at all", which is misleading.
 */
export function getEmptyMessage(status: VendorTabValue, filtered: boolean): string {
  if (filtered) return 'No vendors match your search and filters.';
  return EMPTY_MESSAGES[status];
}
