import { Box, Grid } from '@sinnapi/ui';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  ChartCard,
  KpiRow,
  TrendAreaChart,
  halfPeriodDelta,
  type Kpi,
  type SeriesDef,
} from '@sinnapi/ui/analytics';
import type { EarningsModel } from '../../schema';
import { EarningsBalanceCard } from '@/components/metrics';

type Props = {
  earnings: EarningsModel | undefined;
  loading: boolean;
};

// Booked money leads, cash-out sits under it, and the platform's cut is drawn
// alongside both so the gap between "agreed" and "received" is legible rather
// than something a vendor has to work out from two figures.
const CASH_SERIES: SeriesDef[] = [
  { key: 'earned', label: 'Booked', color: 'primary' },
  { key: 'released', label: 'Paid out', color: 'success' },
  { key: 'commission', label: 'Commission', color: 'warning' },
];

/**
 * Headline money figures. Deltas compare the second half of the window against
 * the first — for period *totals* that is a steadier read than last-bucket vs
 * first-bucket, which a single quiet day can swing wildly.
 */
function toKpis(earnings: EarningsModel): Kpi[] {
  return [
    {
      key: 'earned',
      label: 'Booked into escrow',
      value: earnings.earned,
      format: 'money',
      delta: halfPeriodDelta(earnings.trend, 'earned'),
    },
    {
      key: 'released',
      label: 'Paid out to you',
      value: earnings.released,
      format: 'money',
      delta: halfPeriodDelta(earnings.trend, 'released'),
    },
    {
      key: 'escrow',
      label: 'Held in escrow',
      value: earnings.inEscrow,
      // A live custody balance, not a windowed total — nothing to compare it to.
      format: 'money',
      delta: null,
    },
    {
      key: 'commission',
      label: 'Platform commission',
      value: earnings.commission,
      format: 'money',
      delta: halfPeriodDelta(earnings.trend, 'commission'),
      // Commission climbing is not itself bad — it tracks volume — so the badge
      // is left in its normal polarity rather than inverted like a refund.
    },
  ];
}

export default function EarningsSection({ earnings, loading }: Props) {
  const kpis = earnings ? toKpis(earnings) : [];

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="vs first half" />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard
            title="Money in, money out"
            subtitle="What you booked, what reached you, and the platform's cut"
            icon={<ShowChartIcon />}
            accent="primary"
          >
            <TrendAreaChart
              data={earnings?.trend ?? []}
              series={CASH_SERIES}
              valueFormat="money"
              loading={loading}
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <EarningsBalanceCard earnings={earnings} loading={loading} />
        </Grid>
      </Grid>
    </Box>
  );
}
