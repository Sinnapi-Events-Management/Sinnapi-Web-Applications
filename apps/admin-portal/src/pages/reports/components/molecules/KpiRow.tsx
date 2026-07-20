import { Card, CardContent, Grid, Skeleton } from '@sinnapi/ui';
import type { Kpi } from '../../schema';
import KpiTile from './KpiTile';

type Props = {
  kpis: Kpi[];
  loading?: boolean;
  comparisonLabel?: string;
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

/** Responsive KPI grid — four-up on desktop, two-up on mobile. */
export default function KpiRow({ kpis, loading, comparisonLabel, skeletonCount = 4 }: Props) {
  // Before the first payload we have no labels, so render placeholder tiles.
  if (loading && kpis.length === 0) {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Grid key={i} item xs={6} md={3}>
            <KpiSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      {kpis.map((kpi) => (
        <Grid key={kpi.key} item xs={6} md={3}>
          <KpiTile kpi={kpi} loading={loading} comparisonLabel={comparisonLabel} />
        </Grid>
      ))}
    </Grid>
  );
}
