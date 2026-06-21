import { Card, Table, TableHead, TableRow, TableCell, TableBody } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorRef } from '@/lib/types';
import { useBookings } from './hooks/useBookings';

export default function Bookings() {
  const { rows, isLoading, error } = useBookings();
  return (
    <>
      <PageTitle title="Bookings" subtitle="Platform-wide booking oversight." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No bookings" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell>{b.reference_no}</TableCell>
                    <TableCell>{one<VendorRef>(b.vendors)?.business_name ?? '—'}</TableCell>
                    <TableCell>{formatDate(b.event_date)}</TableCell>
                    <TableCell align="right">{formatMoney(b.amount, b.currency)}</TableCell>
                    <TableCell>
                      <StatusChip status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>
    </>
  );
}
