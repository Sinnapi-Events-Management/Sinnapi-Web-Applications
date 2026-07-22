'use client';
import { Box } from '@sinnapi/ui/atoms';
import type { VendorListingModel } from '@/lib/types';
import { VENDOR_PAGE_SIZE } from '@/lib/queries';
import { VendorsGrid, VendorsGridSkeleton } from './molecules/VendorsGrid';
import { VendorsEmpty, VendorsError } from './molecules/VendorsFallback';

type VendorsResultsProps = {
  vendors: VendorListingModel[];
  activeFilters: number;
  isLoading: boolean;
  /** Stale results are on screen while the new filters resolve. */
  isRefreshing: boolean;
  isError: boolean;
  onRetry: () => void;
  onClear: () => void;
};

/**
 * Picks the grid's state — skeletons, error, empty, or results — and nothing
 * else. Each branch lives in its own component so this stays a readable
 * decision, and the branch order matters: an error must win over "empty", or a
 * failed request reads to the visitor as a marketplace with no vendors in it.
 *
 * While refreshing, the previous results stay mounted and dim rather than
 * unmounting into skeletons. Pointer events are suppressed for the moment it
 * takes, so a click can't land on a card that's about to be replaced by a
 * different one under the same cursor.
 */
export default function VendorsResults({
  vendors,
  activeFilters,
  isLoading,
  isRefreshing,
  isError,
  onRetry,
  onClear,
}: VendorsResultsProps) {
  if (isLoading) return <VendorsGridSkeleton count={VENDOR_PAGE_SIZE} />;
  if (isError && vendors.length === 0) return <VendorsError onRetry={onRetry} />;
  if (vendors.length === 0) return <VendorsEmpty activeFilters={activeFilters} onClear={onClear} />;

  return (
    <Box
      aria-busy={isRefreshing}
      sx={{
        transition: 'opacity .15s ease',
        opacity: isRefreshing ? 0.55 : 1,
        pointerEvents: isRefreshing ? 'none' : 'auto',
      }}
    >
      <VendorsGrid vendors={vendors} />
    </Box>
  );
}
