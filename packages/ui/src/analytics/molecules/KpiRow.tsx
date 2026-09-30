'use client';
import { Card, CardContent, Grid, Skeleton } from '@mui/material';
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
    <Grid container spacing={2}>
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
  );
}
