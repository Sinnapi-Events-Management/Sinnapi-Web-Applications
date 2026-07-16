import { useMemo } from 'react';
import { DataTable, Alert, Button, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { EscrowModel, VendorRef, BookingRef } from '@/lib/types';
import { useEscrow } from './hooks/useEscrow';

export default function Escrow() {
  const { rows, total, isLoading, isFetching, error, has, busy, err, approveRelease, table } =
    useEscrow();

  const columns = useMemo<DataTableColumn<EscrowModel>[]>(
    () => [
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
        headerName: 'Gross',
        align: 'right',
        sortable: true,
        render: (e) => formatMoney(e.gross_amount, e.currency),
      },
      {
        field: 'net_payout_amount',
        headerName: 'Net',
        align: 'right',
        sortable: true,
        render: (e) => formatMoney(e.net_payout_amount, e.currency),
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: true,
        render: (e) => <StatusChip status={e.status} />,
      },
      {
        field: 'action',
        headerName: 'Action',
        align: 'right',
        render: (e) =>
          has('escrow.release') && e.status === 'release_requested' ? (
            <Button
              size="small"
              variant="contained"
              disabled={busy === e.id}
              onClick={() => approveRelease(e.id)}
            >
              Approve release
            </Button>
          ) : null,
      },
    ],
    [has, busy, approveRelease],
  );

  return (
    <>
      <PageTitle
        title="Escrow"
        subtitle="Approve releases once the client has confirmed. Approval creates a payout for Finance to process."
      />
      {(err || error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err ?? (error instanceof Error ? error.message : 'Failed to load escrow transactions.')}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(e) => e.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No escrow transactions yet."
        {...table.controls}
      />
    </>
  );
}
