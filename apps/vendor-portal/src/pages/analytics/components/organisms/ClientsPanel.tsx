import { Box, Grid } from '@sinnapi/ui';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import InventoryIcon from '@mui/icons-material/Inventory2';
import CelebrationIcon from '@mui/icons-material/Celebration';
import GroupsIcon from '@mui/icons-material/Groups';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  BreakdownDonut,
  GroupedBarChart,
  KpiRow,
  type Kpi,
  type SeriesDef,
} from '@sinnapi/ui/analytics';
import type { ExportFormat, ReportTable } from '@sinnapi/ui/export';
import { pickTables, type AnalyticsModel } from '../../schema';
import AnalyticsChartCard from '../molecules/AnalyticsChartCard';
import RankedList from '../molecules/RankedList';

type Props = {
  detail: AnalyticsModel | undefined;
  loading: boolean;
  tables: ReportTable[];
  onExport: (tables: ReportTable[], format: ExportFormat) => void;
};

// Bookings, not money: seasonality is a question about how busy the calendar
// is, and a single large wedding would make a revenue series claim a peak in a
// month with one job in it.
const SEASON_SERIES: SeriesDef[] = [{ key: 'bookings', label: 'Bookings', color: 'secondary' }];

function toKpis(detail: AnalyticsModel): Kpi[] {
  return [
    {
      key: 'clients',
      label: 'Clients all time',
      value: detail.clients.total,
      format: 'number',
      delta: null,
    },
    {
      key: 'new',
      label: 'New this period',
      value: detail.clients.newClients,
      format: 'number',
      delta: null,
    },
    {
      key: 'repeat',
      label: 'Booked you again',
      value: detail.clients.repeat,
      format: 'number',
      delta: null,
    },
    {
      key: 'repeat-rate',
      label: 'Repeat rate',
      // Lifetime, like the two counts it sits beside — a repeat rate measured
      // over 30 days is arithmetic about a month, not about loyalty.
      value: detail.clients.repeatRate ?? 0,
      format: 'percent',
      delta: null,
    },
  ];
}

/**
 * Where the work actually comes from: which services and packages earn, what
 * kind of events book this vendor, who comes back, and when the year is busy.
 *
 * This panel has no counterpart on the dashboard, and it is the reason the
 * Analytics page exists as more than a second view of the same figures —
 * attribution is analysis, not today's work.
 */
export default function ClientsPanel({ detail, loading, tables, onExport }: Props) {
  const kpis = detail ? toKpis(detail) : [];

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="" />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} md={6}>
          <AnalyticsChartCard
            title="Services that earn"
            subtitle="Booked value by service, this period"
            icon={<DesignServicesIcon />}
            accent="primary"
            tables={pickTables(tables, 'Top services')}
            onExport={onExport}
          >
            <RankedList
              items={detail?.services ?? []}
              loading={loading}
              emptyMessage="No bookings were taken in this period."
            />
          </AnalyticsChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AnalyticsChartCard
            title="Packages that convert"
            subtitle="Accepted value by package, with its win rate"
            icon={<InventoryIcon />}
            accent="secondary"
            tables={pickTables(tables, 'Top packages')}
            onExport={onExport}
          >
            <RankedList
              items={detail?.packages ?? []}
              loading={loading}
              emptyMessage="No quotes were built from a package in this period."
            />
          </AnalyticsChartCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <AnalyticsChartCard
            title="What you get booked for"
            subtitle="Bookings by event type"
            icon={<CelebrationIcon />}
            accent="info"
            tables={pickTables(tables, 'Event types')}
            onExport={onExport}
          >
            <BreakdownDonut data={detail?.eventTypes ?? []} loading={loading} />
          </AnalyticsChartCard>
        </Grid>

        <Grid item xs={12} md={7}>
          <AnalyticsChartCard
            title="Your best clients"
            subtitle="By value booked with you, all time"
            icon={<GroupsIcon />}
            accent="success"
            tables={pickTables(tables, 'Top clients', 'Clients')}
            onExport={onExport}
          >
            <RankedList
              items={detail?.clients.top ?? []}
              loading={loading}
              emptyMessage="No completed bookings yet."
              skeletonCount={3}
            />
          </AnalyticsChartCard>
        </Grid>

        <Grid item xs={12}>
          <AnalyticsChartCard
            title="When your year is busy"
            subtitle="Bookings by event date — always the last twelve months"
            icon={<CalendarMonthIcon />}
            accent="warning"
            tables={pickTables(tables, 'Seasonality (12 months)')}
            onExport={onExport}
          >
            <GroupedBarChart
              data={detail?.seasonality ?? []}
              series={SEASON_SERIES}
              loading={loading}
              height={260}
            />
          </AnalyticsChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}
