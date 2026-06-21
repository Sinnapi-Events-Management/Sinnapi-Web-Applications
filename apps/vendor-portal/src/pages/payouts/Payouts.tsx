import { Card, Table, TableHead, TableRow, TableCell, TableBody } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { formatMoney, formatDate } from '@/lib/config';
import { usePayouts } from './hooks/usePayouts';

function PayoutsTable({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error } = usePayouts(vendorId);
  return (
    <QueryState isLoading={isLoading} error={error}>
      {rows.length === 0 ? (
        <EmptyState
          title="No payouts yet"
          description="Once escrow is released and approved, your payouts appear here."
        />
      ) : (
        <Card variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Requested</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Approved</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{formatDate(p.created_at)}</TableCell>
                  <TableCell align="right">
                    <strong>{formatMoney(p.amount, p.currency)}</strong>
                  </TableCell>
                  <TableCell>{formatDate(p.approved_at)}</TableCell>
                  <TableCell>{formatDate(p.completed_at)}</TableCell>
                  <TableCell>
                    <StatusChip status={p.status} />
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

export default function Payouts() {
  return (
    <>
      <PageTitle title="Payouts" subtitle="Your payout history and status." />
      <VendorGate>{(vendorId) => <PayoutsTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
