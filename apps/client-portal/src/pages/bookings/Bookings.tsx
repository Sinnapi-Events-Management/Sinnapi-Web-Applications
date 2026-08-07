import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  PageTitle,
  QueryState,
  StatusChip,
} from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorRefModel } from '@/lib/types';
import { useBookings } from './hooks/useBookings';
import { EmptyState } from '@sinnapi/ui/router';

export default function Bookings() {
  const { rows, isLoading, error, openBooking } = useBookings();

  return (
    <>
      <PageTitle title="Bookings" subtitle="Track and manage all your vendor bookings." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Find a vendor and request your first booking."
            ctaLabel="Discover vendors"
            ctaHref="/discover"
          />
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
                  <TableRow
                    key={b.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => openBooking(b.id)}
                  >
                    <TableCell>
                      <Typography variant="body2">{b.reference_no}</Typography>
                    </TableCell>
                    <TableCell>{one<VendorRefModel>(b.vendors)?.business_name ?? '—'}</TableCell>
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
