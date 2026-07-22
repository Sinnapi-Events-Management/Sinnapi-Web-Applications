'use client';
import { Box, Button, Typography } from '@sinnapi/ui/atoms';
import { ErrorOutline, Refresh } from '@mui/icons-material';
import EmptyState from '@/components/molecules/emptyState';

/**
 * Nothing matched. The copy and the way out both depend on *why* it's empty: a
 * visitor who filtered too hard needs their filters back, while a feed with
 * nothing published yet is not their fault and offering them a "clear filters"
 * button they never used would just be confusing.
 */
export function EventsEmpty({
  activeFilters,
  onClear,
}: {
  activeFilters: number;
  onClear: () => void;
}) {
  if (activeFilters === 0) {
    return (
      <EmptyState
        title="No events published yet"
        description="Check back soon for event inspiration and open opportunities looking for vendors."
      />
    );
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <EmptyState
        title="No events match your filters"
        description="Try a different occasion, date, town or budget — or clear your filters to see everything."
      />
      <Button variant="contained" onClick={onClear} sx={{ mt: -2, mb: 4 }}>
        Clear filters
      </Button>
    </Box>
  );
}

/**
 * The query failed. Distinct from "no results" on purpose — telling someone
 * there are no events when the network dropped is a lie they'd act on. Retry
 * goes through TanStack Query's `refetch`, so a recovery costs one request, not
 * a page reload.
 */
export function EventsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 2 }} role="alert">
      <ErrorOutline sx={{ fontSize: 48, color: 'error.light' }} />
      <Typography variant="h5" sx={{ mt: 2 }}>
        We couldn’t load events
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
