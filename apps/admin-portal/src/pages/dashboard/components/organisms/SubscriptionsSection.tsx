import { Box, Grid } from '@sinnapi/ui';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SegmentIcon from '@mui/icons-material/Segment';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import ChartCard from '@/components/analytics/ChartCard';
import KpiRow from '@/components/analytics/KpiRow';
import TrendAreaChart from '@/components/analytics/charts/TrendAreaChart';
import GroupedBarChart from '@/components/analytics/charts/GroupedBarChart';
import BreakdownDonut from '@/components/analytics/charts/BreakdownDonut';
import StackedShareBar from '@/components/analytics/StackedShareBar';
import { halfPeriodDelta, seriesDelta, type Kpi, type SeriesDef } from '@/lib/analytics';
import type { SubscriptionModel } from '../../schema';
import ConversionMeter from '../molecules/ConversionMeter';

type Props = {
  subscriptions: SubscriptionModel | null;
  loading: boolean;
};

const MRR_SERIES: SeriesDef[] = [{ key: 'mrr', label: 'MRR', color: 'success' }];
const CHURN_SERIES: SeriesDef[] = [
  { key: 'added', label: 'New', color: 'success' },
  { key: 'churned', label: 'Churned', color: 'error' },
];

/**
 * Plan revenue: the platform's primary income line.
 *
 * MRR is a *level*, not a window total, so its delta compares the first and last
 * bucket — where it started against where it stands. The count metrics below it
 * are windowed totals and compare halves instead.
 */
function toKpis(subs: SubscriptionModel): Kpi[] {
  return [
    {
      key: 'mrr',
      label: 'Recurring revenue',
      value: subs.mrr,
      format: 'money',
      delta: seriesDelta(subs.trend, 'mrr'),
    },
    {
      key: 'active',
      label: 'Active subscriptions',
      value: subs.active,
      format: 'number',
      delta: halfPeriodDelta(subs.trend, 'added'),
    },
    {
      key: 'at-risk',
      label: 'MRR at risk',
      value: subs.mrrAtRisk,
      format: 'money',
      // A live balance in a failure state — no window to compare it against.
      delta: null,
      invertDelta: true,
    },
    {
      key: 'churn',
      label: 'Churn rate',
      value: subs.churnRate,
      format: 'percent',
      delta: halfPeriodDelta(subs.trend, 'churned'),
      // Churn climbing is the bad direction, so the badge inverts.
      invertDelta: true,
    },
  ];
}

export default function SubscriptionsSection({ subscriptions, loading }: Props) {
  const kpis = subscriptions ? toKpis(subscriptions) : [];

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="over period" />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard
            title="Monthly recurring revenue"
            subtitle="Annual plans normalised to a monthly figure"
            icon={<AutorenewIcon />}
            accent="success"
          >
            <TrendAreaChart
              data={subscriptions?.trend ?? []}
              series={MRR_SERIES}
              valueFormat="money"
              loading={loading}
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard
            title="Revenue by plan"
            subtitle="Which plans carry the MRR"
            icon={<WorkspacePremiumIcon />}
            accent="primary"
          >
            <BreakdownDonut data={subscriptions?.planMix ?? []} loading={loading} />
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <ChartCard
            title="New vs churned"
            subtitle="Subscriptions gained and lost per period"
            icon={<CompareArrowsIcon />}
            accent="secondary"
          >
            <GroupedBarChart
              data={subscriptions?.trend ?? []}
              series={CHURN_SERIES}
              loading={loading}
              legend
              height={240}
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={7} lg={4}>
          <ChartCard
            title="Subscription status"
            subtitle="Distribution across the base"
            icon={<SegmentIcon />}
            accent="info"
          >
            {/* Seven lifecycle states — past the point where arcs stay
                distinguishable, so this reads as a bar, not a ring. */}
            <StackedShareBar data={subscriptions?.statusMix ?? []} loading={loading} />
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={5} lg={3}>
          <ChartCard
            title="Trial conversion"
            subtitle="Trials that ended this period"
            icon={<HourglassBottomIcon />}
            accent="warning"
          >
            <ConversionMeter
              trials={subscriptions?.trials}
              conversion={subscriptions?.trialConversion ?? null}
              loading={loading}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}
