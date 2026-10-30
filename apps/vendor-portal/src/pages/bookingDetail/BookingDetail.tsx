import { Box, DetailTabPanel, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import BookingHero from './components/organisms/BookingHero';
import BookingActionBar from './components/organisms/BookingActionBar';
import BookingReviewCard from './components/organisms/BookingReviewCard';
import BookingTabs from './components/molecules/BookingTabs';
import OverviewSection from './components/organisms/OverviewSection';
import MoneySection from './components/organisms/MoneySection';
import ProgressSection from './components/organisms/ProgressSection';
import OriginSection from './components/organisms/OriginSection';
import { useBookingDetailPage } from './hooks/useBookingDetailPage';

/**
 * A single booking as the vendor sees it: what was asked for, who asked, how it
 * has progressed, and what they can do about it.
 *
 * Two things stay above the tabs and never move: the hero, which says which
 * booking this is, and the action bar, which is the only part of the page that
 * *does* anything. Everything below them is a record, split into four sections
 * that each fit a screen — the ten cards this page used to stack in one column
 * meant a vendor chasing a payout scrolled past the event, the quote and the
 * whole status trail to reach it.
 *
 * A third thing joins them, but only when it exists: the client's rating of
 * this booking. It used to live solely on the Reviews page, so a vendor who
 * wanted to know how one job went had to leave the booking, open a list of
 * every review they had ever had, and recognise the right card from a name and
 * a relative date. It is the last fact about a finished booking and an
 * unanswered one is a job, so it sits with the actions rather than behind a
 * tab — and `BookingReviewCard` renders nothing at all on the bookings that
 * have no review, which is most of them.
 *
 * Layout only — `useBookingDetailPage` owns the reads and the open section, and
 * each section owns its own content.
 */
export default function BookingDetail() {
  const {
    booking,
    client,
    isClientLoading,
    timeWindow,
    needsResponse,
    tab,
    setTab,
    isLoading,
    error,
  } = useBookingDetailPage();

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
          <BookingActionBar booking={booking} needsResponse={needsResponse} />
          <BookingReviewCard bookingId={booking.id} clientName={client?.full_name} />

          <BookingTabs value={tab} onChange={setTab} />

          <DetailTabPanel value="overview" active={tab} idPrefix="booking">
            <OverviewSection
              booking={booking}
              client={client}
              isClientLoading={isClientLoading}
              timeWindow={timeWindow}
            />
          </DetailTabPanel>
          <DetailTabPanel value="money" active={tab} idPrefix="booking">
            <MoneySection booking={booking} />
          </DetailTabPanel>
          <DetailTabPanel value="progress" active={tab} idPrefix="booking">
            <ProgressSection booking={booking} />
          </DetailTabPanel>
          <DetailTabPanel value="origin" active={tab} idPrefix="booking">
            <OriginSection booking={booking} client={client} />
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}
