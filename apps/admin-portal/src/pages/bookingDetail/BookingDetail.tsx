import { Grid, QueryState, Snackbar, Stack } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useBookingDetail } from './hooks/useBookingDetail';
import BookingHero from './components/organisms/BookingHero';
import BookingFactsCard from './components/organisms/BookingFactsCard';
import BookingQuotationCard from './components/organisms/BookingQuotationCard';
import BookingActivityCard from './components/organisms/BookingActivityCard';
import BookingStatusCard from './components/organisms/BookingStatusCard';
import BookingStatusDialog from './components/organisms/BookingStatusDialog';
import BookingPartiesCard from './components/organisms/BookingPartiesCard';
import BookingMoneyCard from './components/organisms/BookingMoneyCard';

/**
 * One booking as the console sees it: what was agreed, who it is between, what
 * the money is doing, and everything that has happened to it — with the
 * lifecycle control beside them.
 *
 * Layout only. `useBookingDetail` owns the reads and the override flow; each
 * section owns its own content.
 *
 * The status control leads the right column deliberately. An operator opens
 * this page from a support thread with something to change, and the trail
 * they need to justify it is one column across rather than a scroll away.
 */
export default function BookingDetail() {
  const {
    booking,
    timeWindow,
    activity,
    isActivityLoading,
    activityError,
    targets,
    status,
    isLoading,
    error,
  } = useBookingDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!booking ? (
        <EmptyState
          title="Booking not found"
          description="This booking may have been removed."
          ctaLabel="Back to bookings"
          ctaHref="/bookings"
        />
      ) : (
        <>
          <BookingHero booking={booking} timeWindow={timeWindow} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <BookingFactsCard booking={booking} timeWindow={timeWindow} />
                <BookingMoneyCard booking={booking} />
                {booking.quotation && <BookingQuotationCard quotation={booking.quotation} />}
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                <BookingStatusCard
                  targets={targets}
                  onSelect={status.request}
                  busy={status.busy}
                  error={status.err}
                />
                <BookingPartiesCard booking={booking} />
                <BookingActivityCard
                  entries={activity}
                  isLoading={isActivityLoading}
                  error={activityError}
                />
              </Stack>
            </Grid>
          </Grid>

          <BookingStatusDialog
            pending={status.pending}
            reference={booking.reference_no}
            reason={status.reason}
            onReasonChange={status.setReason}
            busy={status.busy}
            error={status.err}
            onConfirm={status.confirm}
            onCancel={status.cancel}
          />

          <Snackbar
            open={!!status.notice}
            message={status.notice ?? ''}
            onClose={status.clearNotice}
            autoHideDuration={4000}
          />
        </>
      )}
    </QueryState>
  );
}
