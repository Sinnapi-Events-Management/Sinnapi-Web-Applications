import { Grid, Stack } from '@sinnapi/ui';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { ReportPeriod, SeriesDef } from '../../schema';
import { useVendorReport } from '../../data';
import KpiRow from '@/components/analytics/KpiRow';
import ChartCard from '../molecules/ChartCard';
import GroupedBarChart from '@/components/analytics/charts/GroupedBarChart';
import TrendAreaChart from '@/components/analytics/charts/TrendAreaChart';
import BreakdownDonut from '@/components/analytics/charts/BreakdownDonut';
import ReportShell from './ReportShell';

const SIGNUP_SERIES: SeriesDef[] = [{ key: 'signups', label: 'New vendors', color: 'secondary' }];
const CUMULATIVE_SERIES: SeriesDef[] = [{ key: 'total', label: 'Total vendors', color: 'primary' }];

type Props = { period: ReportPeriod; onPeriodChange: (next: ReportPeriod) => void };

export default function VendorReportPanel({ period, onPeriodChange }: Props) {
  const { data, isLoading, error, tables } = useVendorReport(period);
  const forName = (name: string) => tables.filter((t) => t.name === name);

  return (
    <ReportShell
      title="Vendors & growth"
      description="Vendor signups, lifecycle and marketplace growth,"
      period={period}
      onPeriodChange={onPeriodChange}
      tables={tables}
      error={error}
    >
      {(exportTables) => (
        <Stack spacing={3}>
          <KpiRow kpis={data?.kpis ?? []} loading={isLoading} comparisonLabel="vs period start" />
          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <ChartCard
                title="New vendor signups"
                subtitle="Vendors onboarded per period"
                icon={<PersonAddIcon />}
                accent="secondary"
                source="live"
                onExport={(f) => exportTables(forName('Vendor signups'), f)}
              >
                <GroupedBarChart
                  data={data?.signups ?? []}
                  series={SIGNUP_SERIES}
                  loading={isLoading}
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <ChartCard
                title="Vendor status"
                subtitle="Distribution by lifecycle status"
                icon={<StorefrontIcon />}
                accent="info"
                source="live"
                onExport={(f) => exportTables(forName('Vendor status'), f)}
              >
                <BreakdownDonut data={data?.statusMix ?? []} loading={isLoading} />
              </ChartCard>
            </Grid>
            <Grid item xs={12}>
              <ChartCard
                title="Marketplace growth"
                subtitle="Cumulative vendors over time"
                icon={<TrendingUpIcon />}
                accent="success"
                source="live"
                onExport={(f) => exportTables(forName('Vendor signups'), f)}
              >
                <TrendAreaChart
                  data={data?.cumulative ?? []}
                  series={CUMULATIVE_SERIES}
                  loading={isLoading}
                  height={220}
                />
              </ChartCard>
            </Grid>
          </Grid>
        </Stack>
      )}
    </ReportShell>
  );
}
