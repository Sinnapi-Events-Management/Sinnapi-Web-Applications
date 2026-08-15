import { Box, Grid, Stack, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import BookingHero from './components/organisms/BookingHero';
import BookingFactsCard from './components/organisms/BookingFactsCard';
import BookingTimelineCard from './components/organisms/BookingTimelineCard';
import BookingPaymentCard from './components/organisms/BookingPaymentCard';
import BookingClientCard from './components/organisms/BookingClientCard';
import BookingActionsCard from './components/organisms/BookingActionsCard';
import { useBookingDetail } from './hooks/useBookingDetail';

/**
 * A single booking as the vendor sees it: what was asked for, who asked, how it
 * has progressed, and what they can do about it. Layout only —
 * `useBookingDetail` owns the reads and each section owns its own content.
 */
export default function BookingDetail() {
  const { booking, client, timeWindow, needsResponse, isLoading, error } = useBookingDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      <Box sx={{ mb: 2 }}>
        <BackButton fallback="/bookings" />
      </Box>

      {!booking ? (
        <EmptyState
          title="Booking not found"
          description="This booking may have been removed."
          ctaLabel="Back to bookings"
          ctaHref="/bookings"
        />
      ) : (
        <>
          <BookingHero booking={booking} client={client} timeWindow={timeWindow} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <BookingFactsCard booking={booking} timeWindow={timeWindow} />
                <BookingTimelineCard bookingId={booking.id} status={booking.status} />
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                <BookingActionsCard booking={booking} needsResponse={needsResponse} />
                <BookingPaymentCard booking={booking} />
                <BookingClientCard client={client} />
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </QueryState>
  );
}
