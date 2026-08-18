import { type DataTableColumn, Stack, StatusChip, Tooltip, Typography } from '@sinnapi/ui';
import { settlementMethodLabel } from '@sinnapi/ui';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { PayoutModel, VendorRef } from '@/lib/types';
import PayoutRowActions from '../components/molecules/PayoutRowActions';

const KIND_LABEL: Record<string, string> = {
  advance: 'Advance',
  balance: 'Balance',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

type Actions = {
  has: (permission: string) => boolean;
  busy: string | null;
  approve: (id: string) => void;
  approveSettlement: (id: string) => void;
  openSettlement: (payout: PayoutModel) => void;
};

/**
 * The payout queue's columns.
 *
 * Built as a factory rather than a constant because the action column needs
 * the caller's permissions and handlers, and threading those through a module
 * constant would mean either a context read inside a cell or a stale closure.
 */
export function payoutColumns(actions: Actions): DataTableColumn<PayoutModel>[] {
  return [
    {
      field: 'vendor',
      headerName: 'Vendor',
      render: (p) => one<VendorRef>(p.vendors)?.business_name ?? '—',
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
      field: 'created_at',
      headerName: 'Raised',
      sortable: true,
      render: (p) => formatDate(p.created_at),
    },
    {
      field: 'settlement_method',
      headerName: 'Sent via',
      render: (p) =>
        p.settlement_method ? (
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
        ) : (
          '—'
        ),
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      render: (p) =>
        // A payout raised for a vendor with no payout account is stuck by
        // design. Saying so beats leaving it looking merely unactioned.
        p.blocked_reason ? (
          <Tooltip title="The vendor has no primary payout account on file.">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="body2" color="warning.main" fontWeight={600}>
                Blocked
              </Typography>
            </Stack>
          </Tooltip>
        ) : (
          <StatusChip status={p.status} />
        ),
    },
    {
      field: 'action',
      headerName: 'Action',
      align: 'right',
      render: (p) => <PayoutRowActions payout={p} {...actions} />,
    },
  ];
}
