import { Grid, Stack } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import ReplayIcon from '@mui/icons-material/Replay';
import type { ReportPeriod, SeriesDef } from '../../schema';
import { useRevenueReport } from '../../data';
import KpiRow from '../molecules/KpiRow';
import ChartCard from '../molecules/ChartCard';
import TrendAreaChart from '../molecules/charts/TrendAreaChart';
import GroupedBarChart from '../molecules/charts/GroupedBarChart';
import BreakdownDonut from '../molecules/charts/BreakdownDonut';
import ReportShell from './ReportShell';

const REVENUE_SERIES: SeriesDef[] = [
  { key: 'gross', label: 'Gross revenue', color: 'primary' },
  { key: 'commission', label: 'Commission', color: 'secondary' },
];
const REFUND_SERIES: SeriesDef[] = [{ key: 'refunds', label: 'Refunds', color: 'error' }];

type Props = { period: ReportPeriod; onPeriodChange: (next: ReportPeriod) => void };

export default function RevenueReportPanel({ period, onPeriodChange }: Props) {
  const { data, isLoading, error, tables } = useRevenueReport(period);
  const forName = (name: string) => tables.filter((t) => t.name === name);

  return (
    <ReportShell
      title="Revenue & payments"
      description="Gross revenue, commission and payment mix,"
      period={period}
      onPeriodChange={onPeriodChange}
      tables={tables}
      error={error}
    >
      {(exportTables) => (
        <Stack spacing={3}>
          <KpiRow kpis={data?.kpis ?? []} loading={isLoading} comparisonLabel="vs period start" />
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <ChartCard
                title="Revenue & commission"
                subtitle="Gross revenue vs commission earned"
                icon={<PaymentsIcon />}
                accent="primary"
                source="live"
                onExport={(f) => exportTables(forName('Revenue trend'), f)}
              >
                <TrendAreaChart
                  data={data?.trend ?? []}
                  series={REVENUE_SERIES}
                  valueFormat="money"
                  loading={isLoading}
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} lg={4}>
              <ChartCard
                title="Payment status mix"
                subtitle="Share of payments by status"
                icon={<DonutLargeIcon />}
                accent="info"
                source="live"
                onExport={(f) => exportTables(forName('Payment status mix'), f)}
              >
                <BreakdownDonut data={data?.statusMix ?? []} loading={isLoading} />
              </ChartCard>
            </Grid>
            <Grid item xs={12}>
              <ChartCard
                title="Refunds issued"
                subtitle="Refund value over time"
                icon={<ReplayIcon />}
                accent="error"
                source="live"
                onExport={(f) => exportTables(forName('Refunds'), f)}
              >
                <GroupedBarChart
                  data={data?.refunds ?? []}
                  series={REFUND_SERIES}
                  valueFormat="money"
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
