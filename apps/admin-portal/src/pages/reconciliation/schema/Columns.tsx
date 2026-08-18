import { type DataTableColumn, Button, Chip, Stack, StatusChip, Typography } from '@sinnapi/ui';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { ReconciliationExceptionModel } from '@/lib/types';

/** What each exception kind actually means, in a Finance admin's terms. */
const KIND_LABEL: Record<string, string> = {
  stuck_payment: 'Stuck payment',
  unbalanced_escrow: 'Ledger out of balance',
  psp_amount_mismatch: 'Amount mismatch',
  psp_fee_variance: 'Fee variance',
  orphan_payment: 'Orphan payment',
  missing_payout: 'Missing payout',
  overdue_settlement: 'Settlement overdue',
  webhook_replay: 'Webhook replay',
};

type Actions = {
  has: (permission: string) => boolean;
  busy: string | null;
  openResolve: (row: ReconciliationExceptionModel) => void;
};

export function reconciliationColumns({
  has,
  busy,
  openResolve,
}: Actions): DataTableColumn<ReconciliationExceptionModel>[] {
  return [
    {
      field: 'kind',
      headerName: 'Issue',
      sortable: true,
      render: (r) => (
        <Stack spacing={0.25}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="body2" fontWeight={700}>
              {KIND_LABEL[r.kind] ?? r.kind}
            </Typography>
            {r.severity === 'critical' && <Chip size="small" color="error" label="Critical" />}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {r.detail}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'expected',
      headerName: 'Expected',
      align: 'right',
      render: (r) => formatMoney(r.expected, 'UGX'),
    },
    {
      field: 'actual',
      headerName: 'Actual',
      align: 'right',
      // The gap is the whole point of the row, so it is the emphasised figure.
      render: (r) =>
        r.actual == null ? (
          '—'
        ) : (
          <Typography variant="body2" fontWeight={700} color="error.main">
            {formatMoney(r.actual, 'UGX')}
          </Typography>
        ),
    },
    {
      field: 'occurrences',
      headerName: 'Seen',
      align: 'right',
      sortable: true,
      // A recurring finding is one row that keeps re-firing, not many rows.
      render: (r) => (r.occurrences > 1 ? `${r.occurrences}×` : '1×'),
    },
    {
      field: 'last_seen_at',
      headerName: 'Last seen',
      sortable: true,
      render: (r) => formatDateTime(r.last_seen_at),
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      render: (r) => <StatusChip status={r.status} />,
    },
    {
      field: 'action',
      headerName: 'Action',
      align: 'right',
      render: (r) =>
        has('finance.reconcile') && ['open', 'investigating'].includes(r.status) ? (
          <Button
            size="small"
            variant="outlined"
            disabled={busy === r.id}
            onClick={() => openResolve(r)}
          >
            Work item
          </Button>
        ) : null,
    },
  ];
}
