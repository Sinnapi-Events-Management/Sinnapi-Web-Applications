'use client';
import { Box, Button, Typography } from '@sinnapi/ui/atoms';
import { ErrorOutline, Refresh } from '@mui/icons-material';
import EmptyState from '@/components/molecules/emptyState';

/**
 * Nothing matched. The copy and the way out both depend on *why* it's empty:
 * a visitor who filtered too hard needs their filters back, while an empty
 * marketplace is not their fault and offering them a "clear filters" button
 * they never used would just be confusing.
 */
export function VendorsEmpty({
  activeFilters,
  onClear,
}: {
  activeFilters: number;
  onClear: () => void;
}) {
  if (activeFilters === 0) {
    return (
      <EmptyState
        title="No vendors listed yet"
        description="Check back soon as we verify and onboard providers across every category."
      />
    );
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <EmptyState
        title="No vendors match your filters"
        description="Try a different category, region or price band — or clear your filters to see everyone."
      />
      <Button variant="contained" onClick={onClear} sx={{ mt: -2, mb: 4 }}>
        Clear filters
      </Button>
    </Box>
  );
}

/**
 * The query failed. Distinct from "no results" on purpose — telling someone the
 * marketplace is empty when the network dropped is a lie they'd act on. Retry
 * goes through TanStack Query's `refetch`, so a recovery costs one request, not
 * a page reload.
 */
export function VendorsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 2 }} role="alert">
      <ErrorOutline sx={{ fontSize: 48, color: 'error.light' }} />
      <Typography variant="h5" sx={{ mt: 2 }}>
        We couldn’t load vendors
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 420, mx: 'auto' }}>
        Something went wrong on our side. Your filters are still applied — try again in a moment.
      </Typography>
      <Button variant="contained" startIcon={<Refresh />} onClick={onRetry} sx={{ mt: 3 }}>
        Try again
      </Button>
    </Box>
  );
}
