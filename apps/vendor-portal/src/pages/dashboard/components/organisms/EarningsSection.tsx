import { Box, Grid } from '@sinnapi/ui';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  ChartCard,
  HALF_PERIOD,
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

// Booked money leads and cash-out sits under it, so the lag between agreeing a
// job and being paid for it is legible as a gap between two lines.
//
// Commission is deliberately absent. Under the on-top fee model the client pays
// it above `agreed_amount`, so it is never deducted from this vendor — drawing it
// as a third series here implied a slice coming out of their money.
const CASH_SERIES: SeriesDef[] = [
  { key: 'earned', label: 'Booked', color: 'primary' },
  { key: 'released', label: 'Paid out', color: 'success' },
];

/**
 * Headline money figures — all three of them the vendor's own money.
 *
 * Platform commission used to sit here as a fourth tile. It is Sinnapi's revenue
 * on this vendor's bookings, not a figure they are charged or paid: under the
 * on-top model `net_payout_amount = agreed_amount` and commission is added to
 * what the *client* pays, so there is no gross-vs-take-home gap for a vendor to
 * reconcile. It was also a constant multiple of "Booked into escrow" (one global
 * commission rate), which made its delta a duplicate of that tile's. Sinnapi's
 * cut belongs on the admin Finance surface, where it already is.
 *
 * Deltas compare the second half of the window against the first — for period
 * *totals* that is a steadier read than last-bucket vs first-bucket, which a
 * single quiet day can swing wildly.
 */
function toKpis(earnings: EarningsModel): Kpi[] {
  return [
    {
      key: 'earned',
      label: 'Booked into escrow',
      value: earnings.earned,
      format: 'money',
      delta: halfPeriodDelta(earnings.trend, 'earned'),
      noDeltaLabel: 'No comparison yet',
    },
    {
      key: 'released',
      label: 'Paid out to you',
      value: earnings.released,
      format: 'money',
      delta: halfPeriodDelta(earnings.trend, 'released'),
      noDeltaLabel: 'No comparison yet',
    },
    {
      key: 'escrow',
      label: 'Held in escrow',
      value: earnings.inEscrow,
      // A live custody balance, not a windowed total — nothing to compare it to.
      format: 'money',
      delta: null,
      noDeltaLabel: 'Live total',
    },
  ];
}

export default function EarningsSection({ earnings, loading }: Props) {
  const kpis = earnings ? toKpis(earnings) : [];

  return (
    <Box component="section">
      <KpiRow
        kpis={kpis}
        loading={loading}
        comparisonLabel={HALF_PERIOD.label}
        comparisonHint={HALF_PERIOD.hint}
        skeletonCount={3}
      />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard
            title="Money in, money out"
            subtitle="What you booked against what has reached you so far"
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
