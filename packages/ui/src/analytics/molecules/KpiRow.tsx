'use client';
import { Box, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { formatValue } from '../core';
import type { Kpi } from '../core';
import KpiTile from './KpiTile';

type Props = {
  kpis: Kpi[];
  loading?: boolean;
  comparisonLabel?: string;
  /** Tooltip for `comparisonLabel`, spelling the comparison out in a sentence. */
  comparisonHint?: string;
  /** Skeleton tiles shown before the first data arrives. */
  skeletonCount?: number;
};

function KpiSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Skeleton variant="text" width="55%" />
        <Skeleton variant="text" width="70%" height={44} />
        <Skeleton variant="text" width="35%" />
      </CardContent>
    </Card>
  );
}

/**
 * Desktop columns per tile, so a row that is not four-up still fills its width
 * instead of leaving a hole where a fourth tile used to be. Rows of five or more
 * fall back to four-up and wrap, which reads better than five cramped columns.
 */
function columns(count: number): 3 | 4 | 6 | 12 {
  if (count <= 1) return 12;
  if (count === 2) return 6;
  if (count === 3) return 4;
  return 3;
}

/** Responsive KPI grid — fills the row at desktop width, two-up on mobile. */
export default function KpiRow({
  kpis,
  loading,
  comparisonLabel,
  comparisonHint,
  skeletonCount = 4,
}: Props) {
  // Before the first payload we have no labels, so render placeholder tiles.
  if (loading && kpis.length === 0) {
    const md = columns(skeletonCount);
    return (
      <Grid container spacing={2}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Grid key={i} item xs={6} md={md}>
            <KpiSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  const md = columns(kpis.length);

  return (
    <>
      {/* Phones: one compact card, a line per figure. Four tall tiles in a
          2×2 grid pushed every page's real content a full screen down
          (Discounts, Promotions, Reviews, the dashboard). (2026-11-17) */}
      <Card variant="outlined" sx={{ display: { xs: 'block', sm: 'none' } }}>
        <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
          {kpis.map((kpi) => (
            <Stack
              key={kpi.key}
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              spacing={2}
              sx={{ px: 2, py: 1.25 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" color="text.secondary">
                  {kpi.label}
                </Typography>
                {kpi.delta === null && kpi.noDeltaLabel && (
                  <Typography variant="caption" color="text.disabled">
                    {kpi.noDeltaLabel}
                  </Typography>
                )}
              </Box>
              {loading ? (
                <Skeleton width={60} />
              ) : (
                <Typography
                  fontWeight={700}
                  sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                >
                  {formatValue(kpi.value, kpi.format)}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      </Card>
      <Grid container spacing={2} sx={{ display: { xs: 'none', sm: 'flex' } }}>
        {kpis.map((kpi) => (
          <Grid key={kpi.key} item xs={6} md={md}>
            <KpiTile
              kpi={kpi}
              loading={loading}
              comparisonLabel={comparisonLabel}
              comparisonHint={comparisonHint}
            />
          </Grid>
        ))}
      </Grid>
    </>
  );
}
