import { Card, Table, TableHead, TableRow, TableCell, TableBody } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { BookingRel } from '@/lib/types';
import { useEscrow } from './hooks/useEscrow';

function EscrowTable({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error } = useEscrow(vendorId);
  return (
    <QueryState isLoading={isLoading} error={error}>
      {rows.length === 0 ? (
        <EmptyState
          title="No escrow activity"
          description="Funds clients hold in escrow for your bookings appear here. Release is confirmed by the client and approved by Sinnapi."
        />
      ) : (
        <Card variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Booking</TableCell>
                <TableCell align="right">Gross</TableCell>
                <TableCell align="right">Commission</TableCell>
                <TableCell align="right">Net payout</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{one<BookingRel>(e.bookings)?.reference_no ?? '—'}</TableCell>
                  <TableCell align="right">{formatMoney(e.gross_amount, e.currency)}</TableCell>
                  <TableCell align="right">
                    {formatMoney(e.commission_amount, e.currency)}
                  </TableCell>
                  <TableCell align="right">
                    <strong>{formatMoney(e.net_payout_amount, e.currency)}</strong>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={e.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </QueryState>
  );
}

export default function Escrow() {
  return (
    <>
      <PageTitle
        title="Escrow"
        subtitle="Visibility into funds held for your bookings (read-only)."
      />
      <VendorGate>{(vendorId) => <EscrowTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
