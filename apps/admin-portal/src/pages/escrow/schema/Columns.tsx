import { type DataTableColumn, Button, Stack, StatusChip, Tooltip, Typography } from '@sinnapi/ui';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { EscrowModel, VendorRef, BookingRef } from '@/lib/types';

type Actions = {
  has: (permission: string) => boolean;
  busy: string | null;
  approveRelease: (id: string) => void;
};

/**
 * The escrow register.
 *
 * Money is shown as its three destinations rather than as one gross figure —
 * what the vendor is owed, what Sinnapi earns, and what was passed through to
 * the processor. That is the split the release actually performs, so it is the
 * split a Finance admin should be looking at before approving one.
 */
export function escrowColumns({
  has,
  busy,
  approveRelease,
}: Actions): DataTableColumn<EscrowModel>[] {
  return [
    {
      field: 'booking',
      headerName: 'Booking',
      render: (e) => one<BookingRef>(e.bookings)?.reference_no ?? '—',
    },
    {
      field: 'vendor',
      headerName: 'Vendor',
      render: (e) => one<VendorRef>(e.vendors)?.business_name ?? '—',
    },
    {
      field: 'gross_amount',
      headerName: 'Client paid',
      align: 'right',
      sortable: true,
      render: (e) => formatMoney(e.gross_amount, e.currency),
    },
    {
      field: 'agreed_amount',
      headerName: 'To vendor',
      align: 'right',
      sortable: true,
      render: (e) => (
        <Stack spacing={0} alignItems="flex-end">
          <Typography variant="body2" fontWeight={700}>
            {formatMoney(e.agreed_amount ?? e.net_payout_amount, e.currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatMoney(e.advance_amount, e.currency)} +{' '}
            {formatMoney(e.balance_amount, e.currency)}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'commission_amount',
      headerName: 'Commission',
      align: 'right',
      sortable: true,
      render: (e) => formatMoney(e.commission_amount, e.currency),
    },
    {
      field: 'advance_release_due_at',
      headerName: 'Advance',
      sortable: true,
      render: (e) =>
        e.advance_released_at
          ? `sent ${formatDate(e.advance_released_at)}`
          : e.advance_release_due_at
            ? `due ${formatDate(e.advance_release_due_at)}`
            : '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      render: (e) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <StatusChip status={e.status} />
          {e.timers_frozen_at && (
            <Tooltip title="Timers are frozen — a dispute is open on this escrow.">
              <AcUnitIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    {
      field: 'action',
      headerName: 'Action',
      align: 'right',
      render: (e) =>
        has('escrow.release') && e.status === 'release_requested' ? (
          <Tooltip
            title={
              e.client_confirmed_at
                ? `Client confirmed on ${formatDate(e.client_confirmed_at)}.`
                : 'Auto-released after the confirmation window lapsed — review before approving.'
            }
          >
            <span>
              <Button
                size="small"
                variant="contained"
                color={e.client_confirmed_at ? 'primary' : 'warning'}
                disabled={busy === e.id}
                onClick={() => approveRelease(e.id)}
              >
                Approve release
              </Button>
            </span>
          </Tooltip>
        ) : null,
    },
  ];
}
