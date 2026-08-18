import VendorGate from '@/vendor/VendorGate';
import EventsToolbar from './components/organisms/EventsToolbar';
import EventsResults from './components/organisms/EventsResults';
import ActiveFilterChips from './components/molecules/ActiveFilterChips';
import { usePublicEvents } from './hooks/usePublicEvents';
import { PageTitle } from '@sinnapi/ui';

/**
 * The feed, once we know which vendor is looking. Split from the page below
 * because `usePublicEvents` needs a vendor id and `VendorGate` is what resolves
 * one — a hook can't be called conditionally inside the gate's render prop.
 */
function EventsFeed({ vendorId }: { vendorId: string }) {
  const {
    search,
    filters,
    typeOptions,
    facetCounts,
    events,
    interestedIds,
    total,
    error,
    isLoading,
    isRefreshing,
    isFiltered,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePublicEvents(vendorId);

  return (
    <>
      <EventsToolbar
        search={search}
        filters={filters}
        typeOptions={typeOptions}
        facetCounts={facetCounts}
      />

      <ActiveFilterChips
        values={filters.values}
        typeOptions={typeOptions}
        onRemove={filters.setFacet}
      />

      <EventsResults
        events={events}
        vendorId={vendorId}
        interestedIds={interestedIds}
        total={total}
        error={error}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        isFiltered={isFiltered}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
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
        subtitle="Express interest in open events posted by clients."
      />
      <VendorGate>{(vendorId) => <EventsFeed vendorId={vendorId} />}</VendorGate>
    </>
  );
}
