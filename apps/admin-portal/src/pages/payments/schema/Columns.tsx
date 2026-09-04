import { type DataTableColumn, Stack, StatusChip, Typography } from '@sinnapi/ui';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { PaymentAdminModel } from '@/lib/types';
import { methodLabel, providerLabel, purposeLabel } from './labels';

const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as const;

/**
 * The Payments register's columns.
 *
 * Each row carries the three handles an investigator searches by — the payer,
 * the booking reference and the provider's reference — so a hit in the list
 * can be recognised without opening it. The row itself opens the payment.
 */
export const paymentColumns: DataTableColumn<PaymentAdminModel>[] = [
  {
    field: 'created_at',
    headerName: 'Date',
    sortable: true,
    render: (p) => formatDateTime(p.created_at),
  },
  {
    field: 'payer',
    headerName: 'Payer',
    render: (p) => (
      <Stack spacing={0}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {p.payer_name ?? '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {p.payer_email ?? ''}
        </Typography>
      </Stack>
    ),
  },
  {
    field: 'purpose',
    headerName: 'Purpose',
    render: (p) => purposeLabel(p.purpose),
  },
  {
    field: 'booking',
    headerName: 'Booking',
    render: (p) =>
      p.booking_reference ? (
        <Typography variant="body2" sx={mono}>
          {p.booking_reference}
        </Typography>
      ) : (
        '—'
      ),
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
    sortable: true,
    render: (p) => <strong>{formatMoney(p.amount, p.currency)}</strong>,
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (p) => (
      <Stack spacing={0.25} alignItems="flex-start">
        <StatusChip status={p.status} />
        {p.failure_reason && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {p.failure_reason}
          </Typography>
        )}
      </Stack>
    ),
  },
];
