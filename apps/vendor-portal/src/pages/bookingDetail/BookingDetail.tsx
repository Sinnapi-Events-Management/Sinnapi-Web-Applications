import {
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  Box,
  PageTitle,
  QueryState,
  StatusChip,
} from '@sinnapi/ui';
import BookingResponseActions from '@/components/booking/BookingResponseActions';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileContactRel } from '@/lib/types';
import { useBookingDetail } from './hooks/useBookingDetail';
import { EmptyState } from '@sinnapi/ui/router';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
}

export default function BookingDetail() {
  const { booking: b, isLoading, error } = useBookingDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!b ? (
        <EmptyState title="Booking not found" ctaLabel="Back to bookings" ctaHref="/bookings" />
      ) : (
        <>
          <PageTitle
            title={`Booking ${b.reference_no}`}
            subtitle={one<ProfileContactRel>(b.profiles)?.full_name ?? undefined}
            action={<StatusChip status={b.status} size="medium" />}
          />
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Details
                  </Typography>
                  <Stack spacing={1.5}>
                    <Row label="Event date" value={formatDate(b.event_date)} />
                    <Row label="Location" value={b.location ?? '—'} />
                    <Row label="Amount" value={formatMoney(b.amount, b.currency)} />
                    <Row
                      label="Payment type"
                      value={b.payment_type ? titleize(b.payment_type) : 'Not selected'}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Actions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <BookingResponseActions bookingId={b.id} status={b.status} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </QueryState>
  );
}
