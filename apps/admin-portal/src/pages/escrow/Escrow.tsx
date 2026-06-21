import { Card, Table, TableHead, TableRow, TableCell, TableBody, Button, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorRef, BookingRef } from '@/lib/types';
import { useEscrow } from './hooks/useEscrow';

export default function Escrow() {
  const { rows, isLoading, error, has, busy, err, approveRelease } = useEscrow();

  return (
    <>
      <PageTitle
        title="Escrow"
        subtitle="Approve releases once the client has confirmed. Approval creates a payout for Finance to process."
      />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No escrow transactions" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Booking</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Gross</TableCell>
                  <TableCell align="right">Net</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{one<BookingRef>(e.bookings)?.reference_no ?? '—'}</TableCell>
                    <TableCell>{one<VendorRef>(e.vendors)?.business_name ?? '—'}</TableCell>
                    <TableCell align="right">{formatMoney(e.gross_amount, e.currency)}</TableCell>
                    <TableCell align="right">
                      {formatMoney(e.net_payout_amount, e.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={e.status} />
                    </TableCell>
                    <TableCell align="right">
                      {has('escrow.release') && e.status === 'release_requested' && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busy === e.id}
                          onClick={() => approveRelease(e.id)}
                        >
                          Approve release
                        </Button>
                      )}
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
