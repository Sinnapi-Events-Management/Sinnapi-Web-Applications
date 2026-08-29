import VendorGate from '@/vendor/VendorGate';
import { PageTitle } from '@sinnapi/ui';
import EventsToolbar from './components/organisms/EventsToolbar';
import EventSourceTabs from './components/organisms/EventSourceTabs';
import EventsResults from './components/organisms/EventsResults';
import ActiveFilterChips from './components/molecules/ActiveFilterChips';
import { usePublicEvents } from './hooks/usePublicEvents';
import { useFilterPanel } from './hooks/useFilterPanel';

/**
 * The feed, once we know which vendor is looking. Split from the page below
 * because `usePublicEvents` needs a vendor id and `VendorGate` is what resolves
 * one — a hook can't be called conditionally inside the gate's render prop.
 *
 * The order of the four bands is the page's one design decision: controls, then
 * the mode, then what is currently applied, then results. The chips sit between
 * the tabs and the feed on purpose — they are the answer to "why is this feed
 * so thin", and that question is asked while looking at the feed.
 */
function EventsFeed({ vendorId }: { vendorId: string }) {
  const feed = usePublicEvents(vendorId);
  const panel = useFilterPanel(feed.filters.isActive);

  return (
    <>
      <EventsToolbar
        search={feed.search}
        filters={feed.filters}
        panel={panel}
        typeOptions={feed.typeOptions}
        facetCounts={feed.facetCounts}
        total={feed.total}
        onClearAll={feed.clearAll}
      />

      <EventSourceTabs
        value={feed.filters.values.source}
        onChange={(next) => feed.filters.setFacet('source', next)}
        facetCounts={feed.facetCounts}
        loadingCounts={feed.isLoadingFacets}
      />

      <ActiveFilterChips
        values={feed.filters.values}
        typeOptions={feed.typeOptions}
        onRemove={feed.filters.setFacet}
        onClearAll={feed.clearAll}
      />

      <EventsResults
        events={feed.events}
        vendorId={vendorId}
        interestedIds={feed.interestedIds}
        total={feed.total}
        error={feed.error}
        isLoading={feed.isLoading}
        isRefreshing={feed.isRefreshing}
        isFiltered={feed.isFiltered}
        hasMore={feed.hasMore}
        isLoadingMore={feed.isLoadingMore}
        onLoadMore={feed.loadMore}
        onClearFilters={feed.clearAll}
      />
    </>
  );
}

/**
 * Public events. Search, filters, sort and paging all resolve server-side (see
 * `usePublicEvents`), so this composes the pieces and holds no state itself.
 */
export default function PublicEvents() {
  return (
    <>
      <PageTitle
        title="Public events"
        subtitle="Briefs posted by clients and admins. Express interest to start a conversation."
      />
      <VendorGate>{(vendorId) => <EventsFeed vendorId={vendorId} />}</VendorGate>
    </>
  );
}
