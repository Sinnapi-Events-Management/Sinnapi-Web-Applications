import { type DataTableColumn, StatusChip, Stack, Typography } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { EscrowBookingRel, EscrowModel } from '@/lib/types';
import { escrowLine } from './escrowLine';

/**
 * Columns for the vendor's escrow view. Read-only: release is confirmed by the
 * client and approved by Sinnapi, so there are no row actions here.
 *
 * The emphasis is on `agreed_amount` — under the on-top fee model that is the
 * full sum the vendor receives, with commission and processing charged to the
 * client rather than deducted. The advance and balance beneath it say *when*
 * each part arrives, which is the question a vendor is actually asking.
 */
export const escrowColumns = (
  clientName: (e: EscrowModel) => string,
): DataTableColumn<EscrowModel>[] => [
  {
    field: 'booking',
    headerName: 'Client',
    render: (e) => {
      const b = one<EscrowBookingRel>(e.bookings);
      return (
        <Stack spacing={0}>
          <Typography variant="body2" fontWeight={600}>
            {clientName(e)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {b?.event_date ? `Event ${formatDate(b.event_date)}` : (b?.reference_no ?? '')}
          </Typography>
        </Stack>
      );
    },
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
    headerName: 'Rest',
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
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (e) => (
      <Stack spacing={0.5} alignItems="flex-start">
        <StatusChip status={e.status} domain="vendorEscrow" />
        <Typography variant="caption" color="text.secondary">
          {escrowLine(e)}
        </Typography>
      </Stack>
    ),
  },
];
