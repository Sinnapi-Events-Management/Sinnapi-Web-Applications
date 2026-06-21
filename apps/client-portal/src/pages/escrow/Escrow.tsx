import { Card, CardContent, Stack, Typography, Box, Divider } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import EscrowActions from '@/components/escrow/EscrowActions';
import { formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorNameRefModel, BookingRefModel } from '@/lib/types';
import { useEscrow } from './hooks/useEscrow';

export default function Escrow() {
  const { rows, isLoading, error } = useEscrow();

  return (
    <>
      <PageTitle title="Escrow" subtitle="Funds held safely until you confirm the service." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No escrow transactions"
            description="When you pay for a booking via Sinnapi Escrow, it appears here."
          />
        ) : (
          <Stack spacing={2}>
            {rows.map((e) => (
              <Card key={e.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="h6">
                        {one<VendorNameRefModel>(e.vendors)?.business_name ?? 'Vendor'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Booking {one<BookingRefModel>(e.bookings)?.reference_no ?? '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { sm: 'right' } }}>
                      <Typography variant="h6">
                        {formatMoney(e.gross_amount, e.currency)}
                      </Typography>
                      <StatusChip status={e.status} />
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <EscrowActions escrowId={e.id} status={e.status} />
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </QueryState>
    </>
  );
}
