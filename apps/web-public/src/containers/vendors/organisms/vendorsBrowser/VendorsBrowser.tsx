'use client';
import type { ReactNode } from 'react';
import { Container } from '@sinnapi/ui/atoms';
import SectionHeading from '@/components/molecules/sectionHeading';
import VendorsToolbar from '../vendorsToolbar';
import VendorsResults from '../vendorsResults';
import { useVendorsFilters } from '../../hooks/useVendorsFilters';
import { RESULTS_ANCHOR_ID } from '../../hooks/useVendorsSearchInput';
import { useVendorsSearch } from './hooks/useVendorsSearch';
import VendorsLoadMore from './molecules/VendorsLoadMore';

/**
 * The interactive half of the vendors page: spotlight, toolbar, grid, paging.
 *
 * `featuredSlot` is a fully server-rendered element handed down as a prop, not
 * a component this file imports. That keeps the featured rail in the server
 * payload — indexable, zero client JS, no waterfall — while still letting this
 * client component decide whether to show it, which it must, because "is the
 * view filtered" is now client state that changes without a navigation.
 *
 * The grid excludes featured vendors only while that rail is visible, so a paid
 * placement is never shown twice on screen and never hidden once the rail steps
 * aside. `featuredCount` is the price of that exclusion: the grid's own total
 * no longer covers everything the visitor can see, so the headline count adds
 * the rail back rather than reporting six vendors on a page showing eight.
 */
export default function VendorsBrowser({
  featuredSlot,
  featuredCount,
}: {
  featuredSlot: ReactNode;
  featuredCount: number;
}) {
  const { filters, activeFilters, isDefaultView, clearAll } = useVendorsFilters();

  const {
    vendors,
    total,
    facetCounts,
    isLoading,
    isRefreshing,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useVendorsSearch({ filters, excludeFeatured: isDefaultView });

  return (
    <>
      {isDefaultView && featuredSlot}

      <Container id={RESULTS_ANCHOR_ID} sx={{ py: { xs: 4, md: 6 }, scrollMarginTop: 24 }}>
        {isDefaultView && <SectionHeading overline="Browse" title="All vendors" />}

        <VendorsToolbar
          loaded={vendors.length}
          total={isDefaultView ? total + featuredCount : total}
          facetCounts={facetCounts}
          isLoading={isLoading}
        />

        <VendorsResults
          vendors={vendors}
          activeFilters={activeFilters}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          isError={isError}
          // Wrapped, not passed through: both are click handlers downstream, and
          // TanStack reads its first argument as an options bag — handing it a
          // React event would silently apply whatever properties happen to collide.
          onRetry={() => refetch()}
          onClear={clearAll}
        />

        <VendorsLoadMore
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          loaded={vendors.length}
          total={total}
          onLoadMore={() => fetchNextPage()}
        />
      </Container>
    </>
  );
}
