import { Box, DetailTabPanel, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import BookingHero from './components/organisms/BookingHero';
import BookingNextStepCard from './components/organisms/BookingNextStepCard';
import BookingReviewCard from './components/organisms/BookingReviewCard';
import BookingTabs from './components/molecules/BookingTabs';
import OverviewSection from './components/organisms/OverviewSection';
import MoneySection from './components/organisms/MoneySection';
import ProgressSection from './components/organisms/ProgressSection';
import { useBookingDetailPage } from './hooks/useBookingDetailPage';

/**
 * A single booking as the vendor sees it, redesigned phone-first on
 * 2026-11-17 after vendors said they could not tell what to do next:
 *
 * 1. **Header** — who, for what, when, where, how much, and a Call button.
 * 2. **What to do now** — a progress bar, one sentence and one main button.
 *    It is the only part of the page that does anything.
 * 3. The client's rating, when there is one.
 * 4. **Details · Money · History** — the record, behind three tabs.
 *
 * Layout only — `useBookingDetailPage` owns the reads and the open tab.
 */
export default function BookingDetail() {
  const { booking, client, isClientLoading, timeWindow, tab, setTab, isLoading, error } =
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
        // Room at the bottom on phones for the sticky action button.
        <Box sx={{ pb: { xs: 10, md: 0 } }}>
          <Box sx={{ mb: 2 }}>
            <BookingHero booking={booking} client={client} timeWindow={timeWindow} />
          </Box>
          <BookingNextStepCard
            booking={booking}
            timeWindow={timeWindow}
            onOpenMoney={() => {
              setTab('money');
              requestAnimationFrame(() =>
                document
                  .getElementById('booking-tabs-anchor')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
              );
            }}
          />
          <BookingReviewCard bookingId={booking.id} clientName={client?.full_name} />

          <Box id="booking-tabs-anchor" sx={{ scrollMarginTop: 72 }} />
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
        </Box>
      )}
    </QueryState>
  );
}
