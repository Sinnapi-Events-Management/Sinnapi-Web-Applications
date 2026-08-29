import { DetailTabPanel, PaymentChaseDialog, QueryState, Snackbar } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useBookingDetailPage } from './hooks/useBookingDetailPage';
import BookingHero from './components/organisms/BookingHero';
import BookingActionBar from './components/organisms/BookingActionBar';
import BookingTabs from './components/molecules/BookingTabs';
import OverviewSection from './components/organisms/OverviewSection';
import MoneySection from './components/organisms/MoneySection';
import EscrowSection from './components/organisms/EscrowSection';
import ActivitySection from './components/organisms/ActivitySection';
import OriginSection from './components/organisms/OriginSection';
import BookingStatusDialog from './components/organisms/BookingStatusDialog';

/**
 * One booking as the console sees it: what was agreed, who it is between, what
 * the money is doing, and everything that has happened to it — with the
 * lifecycle control above them all.
 *
 * Two things stay above the tabs and never move: the hero, which says which
 * booking this is, and the status bar, which is the reason an operator opened
 * the page. Everything below them is a record, split into five sections that
 * each fit a screen — the nine cards this page used to stack in two columns
 * meant an operator called about a settlement scrolled past the facts, the
 * amount, the payment clock and the parties to reach it, and on a phone, where
 * the columns collapse into one, past all of it.
 *
 * Escrow gets a section of its own, which the vendor's and client's four-tab
 * pages do not give it. That is deliberate: the console is the only side that
 * acts on a settlement rather than reading one.
 *
 * Layout only. `useBookingDetailPage` owns the reads, the override flow, the
 * payment-clock levers and the open section; each section owns its own content.
 * The dialogs stay at page level because each is opened from a different
 * section's controls and none of them belongs to one.
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
    tab,
    setTab,
    isLoading,
    error,
  } = useBookingDetailPage();

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
          <BookingActionBar
            targets={targets}
            onSelect={status.request}
            busy={status.busy}
            error={status.err}
          />

          <BookingTabs value={tab} onChange={setTab} />

          <DetailTabPanel value="overview" active={tab} idPrefix="booking">
            <OverviewSection booking={booking} timeWindow={timeWindow} />
          </DetailTabPanel>
          <DetailTabPanel value="money" active={tab} idPrefix="booking">
            <MoneySection
              booking={booking}
              canChase={canChase}
              onChase={chase.open}
              chaseBusy={chase.isBusy}
              chaseError={chase.error}
            />
          </DetailTabPanel>
          <DetailTabPanel value="escrow" active={tab} idPrefix="booking">
            <EscrowSection bookingId={booking.id} />
          </DetailTabPanel>
          <DetailTabPanel value="activity" active={tab} idPrefix="booking">
            <ActivitySection
              entries={activity}
              isLoading={isActivityLoading}
              error={activityError}
            />
          </DetailTabPanel>
          <DetailTabPanel value="origin" active={tab} idPrefix="booking">
            <OriginSection booking={booking} />
          </DetailTabPanel>

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
