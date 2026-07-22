import { Box, Grid } from '@sinnapi/ui';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SegmentIcon from '@mui/icons-material/Segment';
import ChartCard from '@/components/analytics/ChartCard';
import KpiRow from '@/components/analytics/KpiRow';
import TrendAreaChart from '@/components/analytics/charts/TrendAreaChart';
import GroupedBarChart from '@/components/analytics/charts/GroupedBarChart';
import StackedShareBar from '@/components/analytics/StackedShareBar';
import { halfPeriodDelta, type Kpi, type SeriesDef } from '@/lib/analytics';
import type { GrowthModel } from '../../schema';

type Props = {
  growth: GrowthModel | null;
  loading: boolean;
};

const SIGNUP_SERIES: SeriesDef[] = [{ key: 'signups', label: 'New vendors', color: 'secondary' }];
const VOLUME_SERIES: SeriesDef[] = [
  { key: 'bookings', label: 'Bookings', color: 'primary' },
  { key: 'quotations', label: 'Quotations', color: 'secondary' },
];

/**
 * Supply and demand side by side. Which KPIs appear depends on what the admin
 * can see — a vendor manager without `bookings.read` gets the supply figures
 * only, and the row closes up rather than showing blanks.
 */
function toKpis(growth: GrowthModel): Kpi[] {
  const kpis: Kpi[] = [];

  if (growth.vendors) {
    kpis.push(
      {
        key: 'active-vendors',
        label: 'Active vendors',
        value: growth.vendors.active,
        format: 'number',
        delta: null,
      },
      {
        key: 'new-vendors',
        label: 'New vendors',
        value: growth.vendors.added,
        format: 'number',
        delta: halfPeriodDelta(growth.vendors.trend, 'signups'),
      },
    );
  }

  if (growth.operations) {
    kpis.push(
      {
        key: 'bookings',
        label: 'Bookings created',
        value: growth.operations.bookings,
        format: 'number',
        delta: halfPeriodDelta(growth.operations.trend, 'bookings'),
      },
      {
        key: 'conversion',
        label: 'Quote → booking',
        value: growth.operations.conversion,
        format: 'percent',
        delta: null,
      },
    );
  }

  if (growth.users) {
    kpis.push({
      key: 'new-users',
      label: 'New accounts',
      value: growth.users.new,
      format: 'number',
      delta: null,
    });
  }

  return kpis;
}

export default function GrowthSection({ growth, loading }: Props) {
  const kpis = growth ? toKpis(growth) : [];
  const vendors = growth?.vendors;
  const operations = growth?.operations;

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="vs first half" skeletonCount={4} />

      {/* Each permitted dataset contributes a 7/5 trend-plus-distribution pair,
          so one dataset fills a single tidy row and both stack into two. */}
      <Grid container spacing={3} sx={{ mt: 0 }}>
        {(loading || vendors) && (
          <>
            <Grid item xs={12} lg={7}>
              <ChartCard
                title="Vendor signups"
                subtitle="New vendors per period"
                icon={<StorefrontIcon />}
                accent="secondary"
              >
                <TrendAreaChart
                  data={vendors?.trend ?? []}
                  series={SIGNUP_SERIES}
                  loading={loading}
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <ChartCard
                title="Vendor status"
                subtitle="Distribution across the roster"
                icon={<SegmentIcon />}
                accent="info"
              >
                <StackedShareBar data={vendors?.statusMix ?? []} loading={loading} />
              </ChartCard>
            </Grid>
          </>
        )}

        {(loading || operations) && (
          <>
            <Grid item xs={12} lg={7}>
              <ChartCard
                title="Booking & quotation volume"
                subtitle="Demand per period"
                icon={<EventNoteIcon />}
                accent="primary"
              >
                <GroupedBarChart
                  data={operations?.trend ?? []}
                  series={VOLUME_SERIES}
                  loading={loading}
                  legend
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <ChartCard
                title="Booking status"
                subtitle="Distribution by status"
                icon={<SegmentIcon />}
                accent="success"
              >
                <StackedShareBar data={operations?.statusMix ?? []} loading={loading} />
              </ChartCard>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
}
