'use client';
import { Box, Button, Skeleton, Stack, Typography } from '@sinnapi/ui/atoms';
import { Refresh } from '@mui/icons-material';

/**
 * First-load placeholder, shaped like the header row plus a few feature rows so
 * the section reserves roughly its real height.
 */
export function ComparisonSkeleton() {
  return (
    <Stack spacing={1.5}>
      <Skeleton variant="rounded" height={40} />
      {Array.from({ length: 8 }, (_, row) => (
        <Skeleton key={row} variant="text" height={28} />
      ))}
    </Stack>
  );
}

/**
 * The matrix failed to load. Quieter than the plan cards' error on purpose:
 * this table is supporting detail, and someone who can still see the cards
 * above it has what they need to choose — a full-height error block here would
 * make a secondary outage look like a broken page.
 */
export function ComparisonError({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ textAlign: 'center', py: 5 }} role="alert">
      <Typography variant="body2" color="text.secondary">
        We couldn’t load the feature comparison just now.
      </Typography>
      <Button size="small" startIcon={<Refresh />} onClick={onRetry} sx={{ mt: 1.5 }}>
        Try again
      </Button>
    </Box>
  );
}
