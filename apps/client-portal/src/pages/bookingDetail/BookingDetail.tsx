import { Box, DetailTabPanel, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import BookingHero from './components/organisms/BookingHero';
import BookingActionBar from './components/organisms/BookingActionBar';
import BookingTabs from './components/molecules/BookingTabs';
import OverviewSection from './components/organisms/OverviewSection';
import MoneySection from './components/organisms/MoneySection';
import ProgressSection from './components/organisms/ProgressSection';
import OriginSection from './components/organisms/OriginSection';
import { useBookingDetailPage } from './hooks/useBookingDetailPage';

/**
 * A single booking as the client sees it: who it is with, what was agreed, how
 * it has progressed, and what to do next.
 *
 * Two things stay above the tabs and never move: the hero, which says which
 * booking this is, and the action bar, which is the only part of the page that
 * *does* anything. Everything below them is a record, split into four sections
 * that each fit a screen — the nine cards this page used to stack in one column
 * meant a client checking whether their deposit had landed scrolled past the
 * event, the quote and the whole status trail to reach it.
 *
 * Layout only — `useBookingDetailPage` owns the reads and the open section, and
 * each section owns its own content.
 */
export default function BookingDetail() {
  const { booking, vendor, timeWindow, canReview, tab, setTab, isLoading, error } =
    useBookingDetailPage();

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
          <BookingActionBar booking={booking} />

          <BookingTabs value={tab} onChange={setTab} />

          <DetailTabPanel value="overview" active={tab} idPrefix="booking">
            <OverviewSection booking={booking} vendor={vendor} timeWindow={timeWindow} />
          </DetailTabPanel>
          <DetailTabPanel value="money" active={tab} idPrefix="booking">
            <MoneySection booking={booking} />
          </DetailTabPanel>
          <DetailTabPanel value="progress" active={tab} idPrefix="booking">
            <ProgressSection booking={booking} canReview={canReview} />
          </DetailTabPanel>
          <DetailTabPanel value="origin" active={tab} idPrefix="booking">
            <OriginSection booking={booking} />
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}
