import { Box, Grid, SectionCard } from '@sinnapi/ui';
import StarIcon from '@mui/icons-material/Star';
import GradingIcon from '@mui/icons-material/Grading';
import {
  ChartCard,
  GroupedBarChart,
  KpiRow,
  type Kpi,
  type SeriesDef,
} from '@sinnapi/ui/analytics';
import type { ReputationModel } from '../../schema';
import { RatingSummary } from '@/components/metrics';

type Props = {
  reputation: ReputationModel | undefined;
  loading: boolean;
};

// One series, so no legend: the card title already names what the bars are.
const RATING_SERIES: SeriesDef[] = [{ key: 'reviews', label: 'Reviews', color: 'secondary' }];

function toKpis(reputation: ReputationModel): Kpi[] {
  return [
    {
      key: 'reviews',
      label: 'Published reviews',
      value: reputation.reviewCount,
      format: 'number',
      delta: null,
    },
    {
      key: 'new',
      label: 'New this period',
      value: reputation.newReviews,
      format: 'number',
      delta: null,
    },
    {
      key: 'unanswered',
      label: 'Awaiting your reply',
      value: reputation.unanswered,
      format: 'number',
      delta: null,
    },
  ];
}

/**
 * What clients say, and what is still owed a reply.
 *
 * The average sits on its own card at display size rather than in the KPI row:
 * it is the figure a client sees on the public profile, and rounding it into a
 * peer tile would both flatten that and lose the decimal that matters at 4.6.
 */
export default function ReputationSection({ reputation, loading }: Props) {
  const kpis = reputation ? toKpis(reputation) : [];

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="" skeletonCount={3} />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} md={5} lg={4}>
          <SectionCard
            title="Your rating"
            subtitle="As shown on your public profile"
            icon={<StarIcon />}
            accent="secondary"
            sx={{ height: '100%' }}
          >
            <RatingSummary
              avgRating={reputation?.avgRating ?? 0}
              reviewCount={reputation?.reviewCount ?? 0}
              loading={loading}
            />
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={7} lg={8}>
          <ChartCard
            title="Rating distribution"
            subtitle="Published reviews by score"
            icon={<GradingIcon />}
            accent="info"
          >
            <GroupedBarChart
              data={reputation?.ratingMix ?? []}
              series={RATING_SERIES}
              loading={loading}
              height={260}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}
