import { Chip, Stack, Typography, type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { SubscriptionAdminModel } from '@/lib/types';

/**
 * Columns for the admin Subscriptions list. The schema takes no row-action
 * handlers — cells only render, and the row itself opens the subscription.
 * Vendor and plan names arrive pre-joined on the row from the RPC; the date
 * columns sort server-side.
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
      <Stack direction="row" spacing={0.5} justifyContent="flex-start" flexWrap="wrap" useFlexGap>
        <StatusChip status={s.status} />
        {/* Expired without ever being prompted to renew: the sweep withheld
            the hide and asked Finance to decide. See migration 0903l. */}
        {s.hide_blocked_at && (
          <Chip size="small" color="warning" variant="outlined" label="Needs review" />
        )}
      </Stack>
    ),
  },
];
