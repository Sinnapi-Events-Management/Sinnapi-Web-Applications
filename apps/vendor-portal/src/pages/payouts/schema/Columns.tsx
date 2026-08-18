import { type DataTableColumn, StatusChip, Stack, Tooltip, Typography } from '@sinnapi/ui';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { settlementMethodLabel } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { PayoutModel } from '@/lib/types';

const KIND_LABEL: Record<string, string> = {
  advance: 'Advance',
  balance: 'Balance',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

/**
 * The vendor's payout history.
 *
 * Sinnapi settles by hand — bank deposit, mobile money, merchant transfer or
 * cash — so the columns that matter most are how it was sent and under what
 * reference: those are what a vendor matches against their own statement. A
 * payout blocked for want of payout details says so rather than sitting
 * silently at 'requested'.
 */
export const payoutColumns: DataTableColumn<PayoutModel>[] = [
  {
    field: 'created_at',
    headerName: 'Raised',
    sortable: true,
    render: (p) => formatDate(p.created_at),
  },
  {
    field: 'kind',
    headerName: 'Tranche',
    sortable: true,
    render: (p) => KIND_LABEL[p.kind] ?? p.kind,
  },
  {
    field: 'amount',
    headerName: 'Amount',
    align: 'right',
    sortable: true,
    render: (p) => <strong>{formatMoney(p.amount, p.currency)}</strong>,
  },
  {
    field: 'settlement_method',
    headerName: 'Sent via',
    render: (p) => (
      <Stack spacing={0}>
        <Typography variant="body2">{settlementMethodLabel(p.settlement_method)}</Typography>
        {p.settlement_reference && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
          >
            {p.settlement_reference}
          </Typography>
        )}
      </Stack>
    ),
  },
  {
    field: 'settled_at',
    headerName: 'Settled',
    sortable: true,
    render: (p) => formatDate(p.settled_at ?? p.completed_at),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (p) =>
      p.blocked_reason ? (
        <Tooltip title="Add your payout details in Settings so we can send this.">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="body2" color="warning.main" fontWeight={600}>
              Needs payout details
            </Typography>
          </Stack>
        </Tooltip>
      ) : (
        <StatusChip status={p.status} />
      ),
  },
];
