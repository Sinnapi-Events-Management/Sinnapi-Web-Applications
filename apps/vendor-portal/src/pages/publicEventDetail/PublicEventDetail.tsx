import { Box, DetailTabPanel, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import VendorGate from '@/vendor/VendorGate';
import EventHero from './components/organisms/EventHero';
import EventDetailTabs from './components/molecules/EventDetailTabs';
import OverviewSection from './components/organisms/OverviewSection';
import PlanSection from './components/organisms/PlanSection';
import QuoteSection from './components/organisms/QuoteSection';
import BookingSection from './components/organisms/BookingSection';
import { usePublicEventDetailPage } from './hooks/usePublicEventDetailPage';

/**
 * One public event, as the vendor deciding whether to bid on it reads it.
 *
 * Split from the page below because `usePublicEventDetailPage` needs a vendor
 * id and `VendorGate` is what resolves one — a hook cannot be called
 * conditionally inside the gate's render prop. The same split the feed uses.
 *
 * The hero stays above the tabs and never moves: it says which brief this is.
 * Everything below is split by the question being asked, and all four sections
 * always render — a section with nothing in it says so rather than taking its
 * tab away underneath a vendor mid-read.
 *
 * Layout only. `usePublicEventDetailPage` owns every read and the open section,
 * and each section owns its own content.
 */
function EventDetail({ vendorId }: { vendorId: string }) {
  const {
    id,
    event,
    eventType,
    notFound,
    isLoading,
    error,
    tab,
    setTab,
    plan,
    quotes,
    bookings,
    interested,
    actionable,
    canExpressInterest,
  } = usePublicEventDetailPage(vendorId);

  return (
    <QueryState isLoading={isLoading} error={error}>
      <Box sx={{ mb: 2 }}>
        <BackButton fallback="/public-events" />
      </Box>

      {notFound || !event ? (
        // Not an error state: `events_public_read` stops matching the moment a
        // client unpublishes, privatises or deletes a brief, so a withdrawn
        // event simply vanishes. Saying "no longer open" is the true version of
        // that; "not found" would suggest a broken link.
        <EmptyState
          title="This event is no longer open"
          description="The client may have taken it down, or it is no longer public."
          ctaLabel="Back to public events"
          ctaHref="/public-events"
        />
      ) : (
        <>
          <EventHero event={event} eventType={eventType} actionable={actionable} />

          <EventDetailTabs
            value={tab}
            onChange={setTab}
            openCount={plan.openCount}
            unsentCount={quotes.unsentCount}
          />

          <DetailTabPanel value="overview" active={tab} idPrefix="public-event">
            <OverviewSection
              event={event}
              eventType={eventType}
              standing={quotes.standing}
              actionable={actionable}
              interested={interested}
              canExpressInterest={canExpressInterest}
            />
          </DetailTabPanel>

          <DetailTabPanel value="plan" active={tab} idPrefix="public-event">
            <PlanSection
              eventId={id}
              plan={plan}
              quotesByRequirement={quotes.byRequirement}
              actionable={actionable}
            />
          </DetailTabPanel>

          <DetailTabPanel value="quote" active={tab} idPrefix="public-event">
            <QuoteSection
              eventId={id}
              quotes={quotes}
              requirements={plan.rows}
              actionable={actionable}
              interested={interested}
              canExpressInterest={canExpressInterest}
            />
          </DetailTabPanel>

          <DetailTabPanel value="booking" active={tab} idPrefix="public-event">
            <BookingSection bookings={bookings} />
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}

/**
 * Public event detail. Gated on a vendor record for the same reason the feed is
 * — every read below it is scoped to one — and holding no state itself.
 */
export default function PublicEventDetail() {
  return <VendorGate>{(vendorId) => <EventDetail vendorId={vendorId} />}</VendorGate>;
}
