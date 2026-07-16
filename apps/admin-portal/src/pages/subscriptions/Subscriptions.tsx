import { DataTable, Alert, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { SubscriptionModel, VendorRef, PricingPlanRef } from '@/lib/types';
import { useSubscriptions } from './hooks/useSubscriptions';

const columns: DataTableColumn<SubscriptionModel>[] = [
  {
    field: 'vendor',
    headerName: 'Vendor',
    render: (s) => one<VendorRef>(s.vendors)?.business_name ?? '—',
  },
  {
    field: 'plan',
    headerName: 'Plan',
    render: (s) => one<PricingPlanRef>(s.pricing_plans)?.name ?? '—',
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
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (s) => <StatusChip status={s.status} />,
  },
];

export default function Subscriptions() {
  const { rows, total, isLoading, isFetching, error, table } = useSubscriptions();

  return (
    <>
      <PageTitle
        title="Subscriptions"
        subtitle="Monitor vendor subscriptions, trials, and grace periods."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load subscriptions.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(s) => s.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No subscriptions yet."
        {...table.controls}
      />
    </>
  );
}
