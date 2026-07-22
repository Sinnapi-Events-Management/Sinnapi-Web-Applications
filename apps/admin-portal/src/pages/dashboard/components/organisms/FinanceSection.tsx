import { Box, Grid } from '@sinnapi/ui';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SegmentIcon from '@mui/icons-material/Segment';
import ChartCard from '@/components/analytics/ChartCard';
import KpiRow from '@/components/analytics/KpiRow';
import TrendAreaChart from '@/components/analytics/charts/TrendAreaChart';
import StackedShareBar from '@/components/analytics/StackedShareBar';
import { halfPeriodDelta, type Kpi, type SeriesDef } from '@/lib/analytics';
import type { FinanceModel } from '../../schema';

type Props = {
  finance: FinanceModel | null;
  loading: boolean;
};

const REVENUE_SERIES: SeriesDef[] = [
  { key: 'gross', label: 'Gross', color: 'primary' },
  { key: 'commission', label: 'Commission', color: 'success' },
  { key: 'refunds', label: 'Refunds', color: 'error' },
];

/**
 * Headline money figures. Deltas compare the second half of the window against
 * the first — for period *totals* that is a steadier read than last-bucket vs
 * first-bucket, which a single quiet day can swing wildly.
 */
function toKpis(finance: FinanceModel): Kpi[] {
  return [
    {
      key: 'gross',
      label: 'Gross revenue',
      value: finance.gross,
      format: 'money',
      delta: halfPeriodDelta(finance.trend, 'gross'),
    },
    {
      key: 'commission',
      label: 'Commission earned',
      value: finance.commission,
      format: 'money',
      delta: halfPeriodDelta(finance.trend, 'commission'),
    },
    {
      key: 'escrow',
      label: 'Escrow held',
      value: finance.escrowHeld,
      format: 'money',
      // A live custody balance, not a windowed total — nothing to compare it to.
      delta: null,
    },
    {
      key: 'refunds',
      label: 'Refunds issued',
      value: finance.refunds,
      format: 'money',
      delta: halfPeriodDelta(finance.trend, 'refunds'),
      // Refunds climbing is the bad direction, so the badge inverts.
      invertDelta: true,
    },
  ];
}

export default function FinanceSection({ finance, loading }: Props) {
  const kpis = finance ? toKpis(finance) : [];

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="vs first half" />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard
            title="Revenue flow"
            subtitle="Gross, commission and refunds per period"
            icon={<ShowChartIcon />}
            accent="primary"
          >
            <TrendAreaChart
              data={finance?.trend ?? []}
              series={REVENUE_SERIES}
              valueFormat="money"
              loading={loading}
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard
            title="Payment status"
            subtitle="Attempts by outcome"
            icon={<SegmentIcon />}
            accent="info"
          >
            <StackedShareBar data={finance?.paymentMix ?? []} loading={loading} />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}
