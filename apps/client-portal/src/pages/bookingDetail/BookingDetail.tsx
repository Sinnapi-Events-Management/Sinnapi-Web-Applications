import { Box, Grid, Stack, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import BookingHero from './components/organisms/BookingHero';
import BookingFactsCard from './components/organisms/BookingFactsCard';
import BookingEventCard from './components/organisms/BookingEventCard';
import BookingQuotationCard from './components/organisms/BookingQuotationCard';
import BookingTimelineCard from './components/organisms/BookingTimelineCard';
import BookingTermsCard from './components/organisms/BookingTermsCard';
import BookingEscrowCard from './components/organisms/BookingEscrowCard';
import BookingSettlementCard from './components/organisms/BookingSettlementCard';
import BookingActionsCard from './components/organisms/BookingActionsCard';
import BookingNextStepsCard from './components/organisms/BookingNextStepsCard';
import { useBookingDetail } from './hooks/useBookingDetail';

/**
 * A single booking as the client sees it: who it is with, what was agreed, how
 * it has progressed, and what to do next. Layout only — `useBookingDetail` owns
 * the reads and each section owns its own content.
 */
export default function BookingDetail() {
  const { booking, vendor, timeWindow, canReview, isLoading, error } = useBookingDetail();

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
          <BookingHero booking={booking} vendor={vendor} timeWindow={timeWindow} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <BookingFactsCard booking={booking} timeWindow={timeWindow} />
                {/* Between the facts and the trail, in the order the booking
                    itself happened: the client asked on an event, a vendor
                    quoted it, and this booking is what that quote became. Both
                    cards draw nothing when the booking had neither. */}
                <BookingEventCard booking={booking} />
                <BookingQuotationCard booking={booking} />
                <BookingTimelineCard bookingId={booking.id} status={booking.status} />
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                <BookingActionsCard booking={booking} />
                {/* Above everything else once it exists: it is the only card
                    on the page that is a question addressed to the client,
                    with their vendor waiting on the answer. It draws nothing
                    until the vendor has asked. */}
                <BookingSettlementCard booking={booking} />
                {/* Above the payment card, and deliberately: what was agreed
                    comes before what is owed, and while the terms are
                    unsettled this is the only card with anything to do. */}
                <BookingTermsCard booking={booking} />
                <BookingEscrowCard booking={booking} />
                <BookingNextStepsCard canReview={canReview} />
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </QueryState>
  );
}
