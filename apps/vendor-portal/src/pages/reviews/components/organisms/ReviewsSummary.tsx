import { Box, Stack } from '@sinnapi/ui';
import { KpiRow, type Kpi } from '@sinnapi/ui/analytics';
import type { RatingBand, StarFilter } from '../../schema';
import RatingBreakdownCard from './RatingBreakdownCard';

type Props = {
  kpis: Kpi[];
  bands: RatingBand[];
  average: number;
  publishedCount: number;
  star: StarFilter;
  onSelectStar: (star: StarFilter) => void;
  loading: boolean;
};

/**
 * What the reviews add up to, above the list of them.
 *
 * The KPI row comes from the shared analytics kit rather than tiles written
 * here, so a figure on this page is rendered by the same component as a figure
 * on the dashboard — one place to change how a metric reads, and no chance of
 * two screens formatting the same count differently.
 *
 * The operational figures lead and the reputational card follows. A vendor
 * opening this page is far more often here to clear what they owe a reply to
 * than to admire an average, and the order of the page should match the order
 * of the job.
 */
export default function ReviewsSummary({
  kpis,
  bands,
  average,
  publishedCount,
  star,
  onSelectStar,
  loading,
}: Props) {
  return (
    <Stack component="section" spacing={3} sx={{ mb: 3 }}>
      <Box>
        <KpiRow kpis={kpis} loading={loading} comparisonLabel="" skeletonCount={4} />
      </Box>

      <RatingBreakdownCard
        average={average}
        publishedCount={publishedCount}
        bands={bands}
        star={star}
        onSelectStar={onSelectStar}
      />
    </Stack>
  );
}
