import { Box, Grid, SectionCard } from '@sinnapi/ui';
import StarIcon from '@mui/icons-material/Star';
import GradingIcon from '@mui/icons-material/Grading';
import ReplyIcon from '@mui/icons-material/Reply';
import { GroupedBarChart, KpiRow, type Kpi, type SeriesDef } from '@sinnapi/ui/analytics';
import type { ExportFormat, ReportTable } from '@sinnapi/ui/export';
import type { ReputationModel } from '@/data/overview';
import { RatingSummary } from '@/components/metrics';
import { pickTables, type SpeedModel } from '../../schema';
import AnalyticsChartCard from '../molecules/AnalyticsChartCard';
import StatReading from '../molecules/StatReading';

type Props = {
  reputation: ReputationModel | undefined;
  speed: SpeedModel | undefined;
  loading: boolean;
  tables: ReportTable[];
  onExport: (tables: ReportTable[], format: ExportFormat) => void;
};

// One series, so no legend: the card title already names what the bars are.
const RATING_SERIES: SeriesDef[] = [{ key: 'reviews', label: 'Reviews', color: 'secondary' }];

function toKpis(reputation: ReputationModel, speed: SpeedModel | undefined): Kpi[] {
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
    {
      key: 'reply-rate',
      label: 'Reply rate',
      // Lifetime, and what a client browsing the public profile actually sees.
      value: speed?.replyRate ?? 0,
      format: 'percent',
      delta: null,
    },
  ];
}

/**
 * What clients say, and how reliably it gets answered.
 *
 * The average sits on its own card at display size rather than in the KPI row:
 * it is the figure a client sees on the public profile, and rounding it into a
 * peer tile would both flatten that and lose the decimal that matters at 4.6.
 *
 * Reply speed is here rather than on Demand because a review response is a
 * reputation act, not a sales one — it is read by everyone who visits the
 * profile long after the booking it belongs to has closed.
 */
export default function ReputationPanel({ reputation, speed, loading, tables, onExport }: Props) {
  const kpis = reputation ? toKpis(reputation, speed) : [];

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="" />

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
          <AnalyticsChartCard
            title="Rating distribution"
            subtitle="Published reviews by score"
            icon={<GradingIcon />}
            accent="info"
            tables={pickTables(tables, 'Rating distribution')}
            onExport={onExport}
          >
            <GroupedBarChart
              data={reputation?.ratingMix ?? []}
              series={RATING_SERIES}
              loading={loading}
              height={260}
            />
          </AnalyticsChartCard>
        </Grid>

        <Grid item xs={12}>
          <AnalyticsChartCard
            title="How fast you reply"
            subtitle="Review published to your public response"
            icon={<ReplyIcon />}
            accent="success"
            tables={pickTables(tables, 'Reputation')}
            onExport={onExport}
          >
            <StatReading
              label="Median reply time"
              value={speed?.replyLabel ?? '—'}
              caption={
                speed
                  ? `You have answered ${speed.replies.toLocaleString()} of ${speed.published.toLocaleString()} published reviews`
                  : undefined
              }
              loading={loading}
              empty={!loading && speed?.replyMedianHours == null}
              emptyMessage="You have not answered a review yet."
            />
          </AnalyticsChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}
