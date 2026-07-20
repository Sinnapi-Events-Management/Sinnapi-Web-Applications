import { Grid, Stack } from '@sinnapi/ui';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import type { ReportPeriod, SeriesDef } from '../../schema';
import { useSubscriptionReport } from '../../data';
import KpiRow from '../molecules/KpiRow';
import ChartCard from '../molecules/ChartCard';
import TrendAreaChart from '../molecules/charts/TrendAreaChart';
import GroupedBarChart from '../molecules/charts/GroupedBarChart';
import BreakdownDonut from '../molecules/charts/BreakdownDonut';
import ReportShell from './ReportShell';

const MRR_SERIES: SeriesDef[] = [{ key: 'mrr', label: 'MRR', color: 'primary' }];
const FLOW_SERIES: SeriesDef[] = [
  { key: 'added', label: 'Added', color: 'success' },
  { key: 'churned', label: 'Churned', color: 'error' },
];

type Props = { period: ReportPeriod; onPeriodChange: (next: ReportPeriod) => void };

export default function SubscriptionReportPanel({ period, onPeriodChange }: Props) {
  const { data, isLoading, error, tables } = useSubscriptionReport(period);
  const forName = (name: string) => tables.filter((t) => t.name === name);

  return (
    <ReportShell
      title="Subscriptions & churn"
      description="Recurring revenue, plan mix and churn,"
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
                title="Recurring revenue"
                subtitle="Monthly recurring revenue over time"
                icon={<ShowChartIcon />}
                accent="primary"
                source="live"
                onExport={(f) => exportTables(forName('MRR trend'), f)}
              >
                <TrendAreaChart
                  data={data?.mrr ?? []}
                  series={MRR_SERIES}
                  valueFormat="money"
                  loading={isLoading}
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} lg={4}>
              <ChartCard
                title="Subscription status"
                subtitle="Distribution by status"
                icon={<WorkspacePremiumIcon />}
                accent="info"
                source="live"
                onExport={(f) => exportTables(forName('Subscription status'), f)}
              >
                <BreakdownDonut data={data?.statusMix ?? []} loading={isLoading} />
              </ChartCard>
            </Grid>
            <Grid item xs={12}>
              <ChartCard
                title="New vs churned"
                subtitle="Subscriptions added and lost per period"
                icon={<CompareArrowsIcon />}
                accent="warning"
                source="live"
                onExport={(f) => exportTables(forName('Subscription flow'), f)}
              >
                <GroupedBarChart
                  data={data?.churnFlow ?? []}
                  series={FLOW_SERIES}
                  loading={isLoading}
                  legend
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
