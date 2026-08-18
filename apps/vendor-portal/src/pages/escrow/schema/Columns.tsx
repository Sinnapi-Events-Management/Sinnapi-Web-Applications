import { type DataTableColumn, StatusChip, Stack, Typography } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { BookingRel, EscrowModel } from '@/lib/types';

/**
 * Columns for the vendor's escrow view. Read-only: release is confirmed by the
 * client and approved by Sinnapi, so there are no row actions here.
 *
 * The emphasis is on `agreed_amount` — under the on-top fee model that is the
 * full sum the vendor receives, with commission and processing charged to the
 * client rather than deducted. The advance and balance beneath it say *when*
 * each part arrives, which is the question a vendor is actually asking.
 */
export const escrowColumns: DataTableColumn<EscrowModel>[] = [
  {
    field: 'booking',
    headerName: 'Booking',
    render: (e) => one<BookingRel>(e.bookings)?.reference_no ?? '—',
  },
  {
    field: 'agreed_amount',
    headerName: 'You receive',
    align: 'right',
    sortable: true,
    render: (e) => (
      <strong>{formatMoney(e.agreed_amount ?? e.net_payout_amount, e.currency)}</strong>
    ),
  },
  {
    field: 'advance_amount',
    headerName: 'Advance',
    align: 'right',
    sortable: true,
    render: (e) => (
      <Stack spacing={0} alignItems="flex-end">
        <Typography variant="body2">{formatMoney(e.advance_amount, e.currency)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {e.advance_released_at
            ? `sent ${formatDate(e.advance_released_at)}`
            : e.advance_release_due_at
              ? `due ${formatDate(e.advance_release_due_at)}`
              : '—'}
        </Typography>
      </Stack>
    ),
  },
  {
    field: 'balance_amount',
    headerName: 'Balance',
    align: 'right',
    sortable: true,
    render: (e) => (
      <Stack spacing={0} alignItems="flex-end">
        <Typography variant="body2">{formatMoney(e.balance_amount, e.currency)}</Typography>
        <Typography variant="caption" color="text.secondary">
          after client confirms
        </Typography>
      </Stack>
    ),
  },
  {
    field: 'gross_amount',
    headerName: 'Client paid',
    align: 'right',
    sortable: true,
    // Context, not the vendor's money: the client pays commission and the
    // processing fee on top, so this is always the larger figure.
    render: (e) => (
      <Typography variant="body2" color="text.secondary">
        {formatMoney(e.gross_amount, e.currency)}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (e) => <StatusChip status={e.status} />,
  },
];
