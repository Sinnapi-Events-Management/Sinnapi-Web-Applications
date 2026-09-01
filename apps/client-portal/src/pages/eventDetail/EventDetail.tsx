import { Box, DetailTabPanel, QueryState, Stack } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import EventHero from './components/organisms/EventHero';
import EventTabs from './components/molecules/EventTabs';
import OverviewSection from './components/organisms/OverviewSection';
import RequirementsSection from './components/organisms/RequirementsSection';
import VendorsSection from './components/organisms/VendorsSection';
import RecommendationsSection from './components/organisms/RecommendationsSection';
import { useEventDetailPage } from './hooks/useEventDetailPage';

/**
 * One posted event as the client plans it: what they said they wanted, how much
 * of their budget is already spoken for, and what they still need to source.
 *
 * The hero stays above the tabs and never moves — it says which event this is.
 * Everything below is split by the question being asked, because the plan can
 * run to a dozen lines and stacking it under the budget card would put the
 * thing a client came to act on below the thing they came to check.
 *
 * Sections deliberately do not report whether they have anything to show, so no
 * tab can disappear underneath a client mid-read — a section with nothing in it
 * says so instead.
 *
 * Layout only — `useEventDetailPage` owns the reads and the open section, and
 * each section owns its own content.
 */
export default function EventDetail() {
  const {
    id,
    event,
    notFound,
    budget,
    budgetLoading,
    budgetError,
    openCount,
    awaitingCount,
    requirements,
    tab,
    setTab,
    isLoading,
    error,
  } = useEventDetailPage();

  return (
    <QueryState isLoading={isLoading} error={error}>
      <Box sx={{ mb: 2 }}>
        <BackButton fallback="/my-events" />
      </Box>

      {notFound || !event ? (
        <EmptyState
          title="Event not found"
          description="This event may have been removed, or it belongs to someone else."
          ctaLabel="Back to my events"
          ctaHref="/my-events"
        />
      ) : (
        <>
          <EventHero event={event} budget={budget} />

          <EventTabs
            value={tab}
            onChange={setTab}
            openCount={openCount}
            awaitingCount={awaitingCount}
          />

          <DetailTabPanel value="overview" active={tab} idPrefix="event">
            <OverviewSection
              event={event}
              budget={budget}
              budgetLoading={budgetLoading}
              budgetError={budgetError}
            />
          </DetailTabPanel>

          <DetailTabPanel value="plan" active={tab} idPrefix="event">
            <RequirementsSection
              eventId={id}
              budget={budget}
              currency={budget?.currency ?? event.currency ?? 'UGX'}
            />
          </DetailTabPanel>

          <DetailTabPanel value="vendors" active={tab} idPrefix="event">
            {/* The board first, then who could fill what it shows as empty —
                the suggestions answer the question the board raises. */}
            <Stack spacing={3}>
              <VendorsSection eventId={id} requirements={requirements} />
              <RecommendationsSection
                eventId={id}
                requirements={requirements}
                eventCurrency={budget?.currency ?? event.currency ?? 'UGX'}
              />
            </Stack>
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}
