import { Grid, Box, Alert, LoadMoreResults } from '@sinnapi/ui';
import VendorCard from '@/components/vendor/VendorCard';
import type { VendorSearchCardModel } from '@/lib/types';
import VendorCardSkeleton from '../atoms/VendorCardSkeleton';
import { EmptyState } from '@sinnapi/ui/router';

type DiscoverResultsProps = {
  vendors: VendorSearchCardModel[];
  total: number;
  error: unknown;
  isLoading: boolean;
  isRefreshing: boolean;
  isFiltered: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

/** One skeleton row, matching the page size the grid actually fetches. */
const SKELETON_COUNT = 8;

const GRID_ITEM = { xs: 12, sm: 6, md: 4, lg: 3 } as const;

/**
 * The grid itself, plus the three states around it: first load, error, and no
 * matches.
 *
 * `isRefreshing` dims the current cards rather than replacing them with
 * skeletons. Changing a filter re-queries the server, and swapping a full grid
 * for placeholders on every keystroke makes the page jump and reads as though
 * the results were lost; keeping the stale cards visible and slightly faded
 * says "these are about to change" without the collapse.
 */
export default function DiscoverResults({
  vendors,
  total,
  error,
  isLoading,
  isRefreshing,
  isFiltered,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: DiscoverResultsProps) {
  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Could not load vendors.'}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <Grid item {...GRID_ITEM} key={index}>
            <VendorCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (vendors.length === 0) {
    return isFiltered ? (
      <EmptyState
        title="No vendors match those filters"
        description="Try a different search term, or widen the category, location or price filters."
      />
    ) : (
      <EmptyState
        title="No vendors listed yet"
        description="Verified providers appear here as they join the marketplace."
      />
    );
  }

  return (
    <>
      <Box
        sx={{
          opacity: isRefreshing ? 0.55 : 1,
          transition: 'opacity .15s ease',
        }}
        aria-busy={isRefreshing}
      >
        <Grid container spacing={3}>
          {vendors.map((vendor) => (
            <Grid item {...GRID_ITEM} key={vendor.id}>
              <VendorCard vendor={vendor} />
            </Grid>
          ))}
        </Grid>
      </Box>

      <LoadMoreResults
        hasMore={hasMore}
        isLoading={isLoadingMore}
        loaded={vendors.length}
        total={total}
        onLoadMore={onLoadMore}
        noun="vendor"
      />
    </>
  );
}
