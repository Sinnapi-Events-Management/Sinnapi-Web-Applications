import DiscoverToolbar from './components/organisms/DiscoverToolbar';
import DiscoverResults from './components/organisms/DiscoverResults';
import ActiveFilterChips from './components/molecules/ActiveFilterChips';
import { PRICE_OPTIONS, RATING_OPTIONS } from './schema/filters';
import { useDiscover } from './hooks/useDiscover';
import { PageTitle } from '@sinnapi/ui';

/**
 * Vendor discovery. Search, filters, sort and paging all resolve server-side
 * (see `useDiscover`), so this composes three pieces and holds no state itself.
 */
export default function Discover() {
  const {
    search,
    filters,
    options,
    facetCounts,
    vendors,
    total,
    error,
    isLoading,
    isRefreshing,
    isFiltered,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useDiscover();

  return (
    <>
      <PageTitle
        title="Discover vendors"
        subtitle="Search verified providers, then request a quote or book."
      />

      <DiscoverToolbar
        search={search}
        filters={filters}
        options={options}
        facetCounts={facetCounts}
      />

      <ActiveFilterChips
        values={filters.values}
        options={{
          category: options.categories,
          region: options.regions,
          price: PRICE_OPTIONS,
          rating: RATING_OPTIONS,
        }}
        onRemove={filters.setFacet}
      />

      <DiscoverResults
        vendors={vendors}
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
