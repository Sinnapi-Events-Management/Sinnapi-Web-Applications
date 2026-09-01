import { Grid, Skeleton, Stack } from '@sinnapi/ui';

/**
 * What fills the page while the plan entitlement is still resolving.
 *
 * Shaped like the page it precedes — toolbar strip, insight row, tab bar, KPI
 * row, chart grid — rather than one generic block, so the layout does not jump
 * when the real thing arrives. The alternative is a single 280px rectangle
 * followed by a full page of content dropping in beneath it.
 */
export default function AnalyticsPageSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rounded" height={68} sx={{ borderRadius: 3 }} />

      <Grid container spacing={2}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Grid key={i} item xs={12} sm={6} lg={4}>
            <Skeleton variant="rounded" height={128} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>

      <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2 }} />

      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid key={i} item xs={6} md={3}>
            <Skeleton variant="rounded" height={112} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Skeleton variant="rounded" height={380} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Skeleton variant="rounded" height={380} sx={{ borderRadius: 3 }} />
        </Grid>
      </Grid>
    </Stack>
  );
}
