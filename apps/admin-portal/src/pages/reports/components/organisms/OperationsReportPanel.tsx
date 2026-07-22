import { Grid, Stack } from '@sinnapi/ui';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GavelIcon from '@mui/icons-material/Gavel';
import PieChartIcon from '@mui/icons-material/PieChart';
import type { ReportPeriod, SeriesDef } from '../../schema';
import { useOperationsReport } from '../../data';
import KpiRow from '@/components/analytics/KpiRow';
import ChartCard from '../molecules/ChartCard';
import GroupedBarChart from '@/components/analytics/charts/GroupedBarChart';
import TrendLineChart from '@/components/analytics/charts/TrendLineChart';
import BreakdownDonut from '@/components/analytics/charts/BreakdownDonut';
import ReportShell from './ReportShell';

const VOLUME_SERIES: SeriesDef[] = [
  { key: 'bookings', label: 'Bookings', color: 'primary' },
  { key: 'quotations', label: 'Quotations', color: 'secondary' },
];
const DISPUTE_SERIES: SeriesDef[] = [
  { key: 'opened', label: 'Opened', color: 'error' },
  { key: 'resolved', label: 'Resolved', color: 'success' },
];

type Props = { period: ReportPeriod; onPeriodChange: (next: ReportPeriod) => void };

export default function OperationsReportPanel({ period, onPeriodChange }: Props) {
  const { data, isLoading, error, tables } = useOperationsReport(period);
  const forName = (name: string) => tables.filter((t) => t.name === name);

  return (
    <ReportShell
      title="Operations & trust"
      description="Bookings volume, escrow flow and dispute resolution,"
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
                title="Booking & quotation volume"
                subtitle="Activity per period"
                icon={<EventNoteIcon />}
                accent="primary"
                source="live"
                onExport={(f) => exportTables(forName('Booking volume'), f)}
              >
                <GroupedBarChart
                  data={data?.volume ?? []}
                  series={VOLUME_SERIES}
                  loading={isLoading}
                  legend
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <ChartCard
                title="Booking status"
                subtitle="Distribution by status"
                icon={<PieChartIcon />}
                accent="info"
                source="live"
                onExport={(f) => exportTables(forName('Booking status'), f)}
              >
                <BreakdownDonut data={data?.statusMix ?? []} loading={isLoading} />
              </ChartCard>
            </Grid>
            <Grid item xs={12}>
              <ChartCard
                title="Dispute resolution"
                subtitle="Disputes opened vs resolved"
                icon={<GavelIcon />}
                accent="warning"
                source="live"
                onExport={(f) => exportTables(forName('Disputes'), f)}
              >
                <TrendLineChart
                  data={data?.disputes ?? []}
                  series={DISPUTE_SERIES}
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
