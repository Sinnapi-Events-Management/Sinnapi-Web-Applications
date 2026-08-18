import type { StatusTabOption } from '@/components/ui/StatusTabs';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { VendorAccountCounts } from '@/hooks/queries';
import { VENDOR_ACCOUNT_STATUSES, type VendorAccountStatus } from '@/lib/status';
import { titleize } from '@/lib/config';

export type VendorAccountTabValue = StatusFilterValue<VendorAccountStatus>;

/** `All` first, then the account lifecycle in order, each with its count badge. */
export function getStatusTabs(
  counts?: VendorAccountCounts,
): StatusTabOption<VendorAccountTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: counts?.all },
    ...VENDOR_ACCOUNT_STATUSES.map((status) => ({
      value: status,
      label: titleize(status),
      count: counts?.[status],
    })),
  ];
}

// Each tab says what an empty result MEANS, since for most of these the empty
// state is the good news and reading "No results" would obscure that.
const EMPTY_MESSAGES: Record<VendorAccountTabValue, string> = {
  [ALL_STATUSES]: 'No vendor accounts yet. Approving an application creates the first one.',
  active: 'No active vendor accounts.',
  pending: 'No vendor accounts awaiting activation.',
  suspended: 'No vendor accounts are currently suspended.',
  deactivated: 'No deactivated vendor accounts.',
  blocked: 'No vendor accounts are blocked.',
};

export function getEmptyMessage(status: VendorAccountTabValue, filtered: boolean): string {
  if (filtered) return 'No vendor accounts match your search.';
  return EMPTY_MESSAGES[status];
}
