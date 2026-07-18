import { Stack, Typography, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate } from '@/lib/config';
import type { SubscriptionAdminModel } from '@/lib/types';

/**
 * Columns for the admin Subscriptions list. The list is a read-only monitoring
 * view, so the schema takes no row-action handlers — cells only render. Vendor
 * and plan names arrive pre-joined on the row from the RPC; the date columns
 * sort server-side.
 */
export const subscriptionColumns: DataTableColumn<SubscriptionAdminModel>[] = [
  {
    field: 'business_name',
    headerName: 'Vendor',
    render: (s) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {s.business_name ?? '—'}
      </Typography>
    ),
  },
  {
    field: 'plan_name',
    headerName: 'Plan',
    render: (s) => s.plan_name ?? '—',
  },
  {
    field: 'current_period_end',
    headerName: 'Period ends',
    sortable: true,
    render: (s) => formatDate(s.current_period_end),
  },
  {
    field: 'grace_until',
    headerName: 'Grace until',
    sortable: true,
    render: (s) => formatDate(s.grace_until),
  },
  {
    field: 'trial_ends_at',
    headerName: 'Trial ends',
    sortable: true,
    render: (s) => formatDate(s.trial_ends_at),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (s) => (
      <Stack direction="row" justifyContent="flex-start">
        <StatusChip status={s.status} />
      </Stack>
    ),
  },
];
