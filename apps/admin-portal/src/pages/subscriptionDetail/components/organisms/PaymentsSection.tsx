import { Link as RouterLink } from 'react-router-dom';
import { DataTable, Link, SectionCard, Stack, StatusChip, Typography } from '@sinnapi/ui';
import type { DataTableColumn } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { SubscriptionAdminPaymentModel } from '@/lib/types';
import { methodLabel, providerLabel } from '@/pages/payments/schema';

type Props = { payments: SubscriptionAdminPaymentModel[] };

const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as const;

const columns: DataTableColumn<SubscriptionAdminPaymentModel>[] = [
  {
    field: 'created_at',
    headerName: 'Opened',
    render: (p) => formatDateTime(p.created_at),
  },
  {
    field: 'target_plan_name',
    headerName: 'For plan',
    render: (p) => p.target_plan_name ?? '—',
  },
  {
    field: 'provider',
    headerName: 'Provider',
    render: (p) => (
      <Stack spacing={0}>
        <Typography variant="body2" noWrap>
          {providerLabel(p.provider)} · {methodLabel(p.provider_method)}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={mono}>
          {p.provider_ref ?? 'no reference yet'}
        </Typography>
      </Stack>
    ),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    align: 'right',
    render: (p) => <strong>{formatMoney(p.amount, p.currency)}</strong>,
  },
  {
    field: 'paid_at',
    headerName: 'Paid',
    render: (p) => (p.paid_at ? formatDateTime(p.paid_at) : '—'),
  },
  {
    field: 'status',
    headerName: 'Status',
    render: (p) => (
      <Stack spacing={0.25} alignItems="flex-start">
        <StatusChip status={p.status} />
        {p.failure_reason && (
          <Typography variant="caption" color="text.secondary">
            {p.failure_reason}
          </Typography>
        )}
      </Stack>
    ),
  },
  {
    field: 'id',
    headerName: '',
    align: 'right',
    render: (p) => (
      <Link component={RouterLink} to={`/payments/${p.id}`} variant="body2" underline="hover">
        Open
      </Link>
    ),
  },
];

/**
 * Every payment made against this subscription, newest first — who paid
 * what, for which plan, on which rail, and whether it went through.
 *
 * "For plan" is read from the payment, not the subscription: the plan a
 * vendor picked but never paid for is never written to the subscription, so
 * the payment row is the only place it is recorded.
 */
export default function PaymentsSection({ payments }: Props) {
  return (
    <SectionCard
      title="Payments"
      icon={<ReceiptLongIcon />}
      subtitle="Each row is one checkout. Open it for the provider's deliveries and raw payloads."
    >
      {payments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No payment has been opened for this subscription. A vendor still on their trial looks like
          this; so does one who has never reached checkout.
        </Typography>
      ) : (
        // The whole history at once: a subscription has a handful of payments a
        // year, so paging it would only hide the older ones behind a click.
        <DataTable
          columns={columns}
          rows={payments}
          getRowId={(p) => p.id}
          rowCount={payments.length}
          page={0}
          pageSize={Math.max(payments.length, 1)}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
        />
      )}
    </SectionCard>
  );
}
