import { Grid, PaymentChaseDialog, QueryState, Snackbar, Stack } from '@sinnapi/ui';
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
import BookingPaymentWindowCard from './components/organisms/BookingPaymentWindowCard';
import BookingSettlementCard from './components/organisms/BookingSettlementCard';

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
    chase,
    canChase,
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
                {booking.quotation && (
                  <BookingQuotationCard quotation={booking.quotation} booking={booking} />
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                {/* Above the lifecycle control: when a settlement is open it
                    is the live piece of work on this booking, with two people
                    waiting on us. It draws nothing when there is none. */}
                <BookingSettlementCard bookingId={booking.id} />
                {/* Above the lifecycle control and below the settlement, in
                    the order the money moves: a booking waiting to be funded
                    is earlier in its life than one waiting to be paid out.
                    Draws nothing once there is no clock. */}
                <BookingPaymentWindowCard
                  booking={booking}
                  canChase={canChase}
                  onChase={chase.open}
                  busy={chase.isBusy}
                  error={chase.error}
                />
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

          <PaymentChaseDialog
            action={chase.pending}
            reference={chase.target?.reference}
            reason={chase.reason}
            onReasonChange={chase.setReason}
            hours={chase.hours}
            onHoursChange={chase.setHours}
            busy={chase.isBusy}
            error={chase.error}
            onConfirm={chase.confirm}
            onCancel={chase.close}
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
