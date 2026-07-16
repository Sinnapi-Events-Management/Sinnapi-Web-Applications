import { DataTable, Alert, Chip, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { formatDateTime, formatMoney, titleize } from '@/lib/config';
import type { LedgerEntryModel } from '@/lib/types';
import { useLedger } from './hooks/useLedger';

const columns: DataTableColumn<LedgerEntryModel>[] = [
  {
    field: 'occurred_at',
    headerName: 'When',
    sortable: true,
    render: (l) => formatDateTime(l.occurred_at),
  },
  { field: 'account', headerName: 'Account', sortable: true, render: (l) => titleize(l.account) },
  {
    field: 'direction',
    headerName: 'Dr/Cr',
    sortable: true,
    render: (l) => (
      <Chip
        size="small"
        color={l.direction === 'debit' ? 'info' : 'success'}
        label={l.direction === 'debit' ? 'DR' : 'CR'}
      />
    ),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    align: 'right',
    sortable: true,
    render: (l) => formatMoney(l.amount, l.currency),
  },
  { field: 'description', headerName: 'Description', render: (l) => l.description },
];

export default function Ledger() {
  const { rows, total, isLoading, isFetching, error, table } = useLedger();

  return (
    <>
      <PageTitle title="Ledger" subtitle="Append-only double-entry ledger (read-only)." />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load ledger entries.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(l) => l.id}
        rowCount={total}
        loading={isLoading || isFetching}
        size="small"
        minWidth={760}
        emptyMessage="No ledger entries yet."
        {...table.controls}
      />
    </>
  );
}
