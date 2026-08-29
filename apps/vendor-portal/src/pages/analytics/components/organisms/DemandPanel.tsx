import { Box, Divider, Grid, Stack } from '@sinnapi/ui';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SegmentIcon from '@mui/icons-material/Segment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  GroupedBarChart,
  KpiRow,
  StackedShareBar,
  halfPeriodDelta,
  type Kpi,
  type SeriesDef,
} from '@sinnapi/ui/analytics';
import type { ExportFormat, ReportTable } from '@sinnapi/ui/export';
import type { PipelineModel } from '@/data/overview';
import { WinRateMeter } from '@/components/metrics';
import { pickTables, type LeadTimeModel, type SpeedModel } from '../../schema';
import AnalyticsChartCard from '../molecules/AnalyticsChartCard';
import StatReading from '../molecules/StatReading';

type Props = {
  pipeline: PipelineModel | undefined;
  leadTime: LeadTimeModel | undefined;
  speed: SpeedModel | undefined;
  loading: boolean;
  tables: ReportTable[];
  onExport: (tables: ReportTable[], format: ExportFormat) => void;
};

const VOLUME_SERIES: SeriesDef[] = [
  { key: 'quotations', label: 'Quote requests', color: 'secondary' },
  { key: 'bookings', label: 'Bookings', color: 'primary' },
];

// One series, so no legend: the card title already names what the bars are.
const LEAD_TIME_SERIES: SeriesDef[] = [{ key: 'bookings', label: 'Bookings', color: 'info' }];

function toKpis(pipeline: PipelineModel): Kpi[] {
  return [
    {
      key: 'quotations',
      label: 'Quote requests',
      value: pipeline.quotations,
      format: 'number',
      delta: halfPeriodDelta(pipeline.trend, 'quotations'),
    },
    {
      key: 'bookings',
      label: 'Bookings taken',
      value: pipeline.bookings,
      format: 'number',
      delta: halfPeriodDelta(pipeline.trend, 'bookings'),
    },
    {
      key: 'upcoming',
      label: 'Confirmed ahead',
      value: pipeline.upcomingCount,
      // A forward-looking count, not a windowed one: it has no previous period.
      format: 'number',
      delta: null,
    },
    {
      key: 'completed',
      label: 'Jobs delivered',
      value: pipeline.completed,
      format: 'number',
      delta: null,
    },
  ];
}

/**
 * Demand and what became of it — the dashboard's Bookings tab, plus the two
 * readings that explain the win rate rather than restating it.
 *
 * Response speed sits directly beside the win rate because on a marketplace it
 * is the strongest thing a vendor personally controls: quotes answered inside
 * a day convert at a different level from quotes answered in three. Lead time
 * sits under the volume chart because it describes the same bookings those
 * bars count, one question deeper.
 */
export default function DemandPanel({
  pipeline,
  leadTime,
  speed,
  loading,
  tables,
  onExport,
}: Props) {
  const kpis = pipeline ? toKpis(pipeline) : [];

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="vs first half" />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} lg={8}>
          <AnalyticsChartCard
            title="Requests and bookings"
            subtitle="Incoming demand against the work you took on"
            icon={<BarChartIcon />}
            accent="primary"
            tables={pickTables(tables, 'Demand trend')}
            onExport={onExport}
          >
            <GroupedBarChart
              data={pipeline?.trend ?? []}
              series={VOLUME_SERIES}
              loading={loading}
              legend
              height={320}
            />
          </AnalyticsChartCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            <AnalyticsChartCard
              title="Win rate"
              subtitle="Quotes answered in this period"
              icon={<EmojiEventsIcon />}
              accent="success"
              tables={pickTables(tables, 'Quote outcomes')}
              onExport={onExport}
            >
              <WinRateMeter
                winRate={pipeline?.winRate ?? null}
                accepted={pipeline?.quotesAccepted ?? 0}
                answered={pipeline?.quotesAnswered ?? 0}
                loading={loading}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="How fast you answer"
              subtitle="Request received to quote sent"
              icon={<BoltIcon />}
              accent="warning"
            >
              <StatReading
                label="Median turnaround"
                value={speed?.quoteLabel ?? '—'}
                caption={
                  speed
                    ? `Across ${speed.quotesPriced.toLocaleString()} ${speed.quotesPriced === 1 ? 'quote' : 'quotes'} you priced this period`
                    : undefined
                }
                loading={loading}
                empty={!loading && speed?.quoteMedianHours == null}
                emptyMessage="You have not priced a request in this period."
              />
            </AnalyticsChartCard>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={7}>
          <AnalyticsChartCard
            title="How far ahead clients book"
            subtitle="Days between a booking being taken and the event"
            icon={<ScheduleIcon />}
            accent="info"
            tables={pickTables(tables, 'Booking lead time')}
            onExport={onExport}
          >
            <Stack spacing={1}>
              <StatReading
                label="Typical horizon"
                value={leadTime?.headline ?? '—'}
                caption={
                  leadTime && leadTime.sample > 0
                    ? `Median across ${leadTime.sample.toLocaleString()} ${leadTime.sample === 1 ? 'booking' : 'bookings'} in this period`
                    : undefined
                }
                loading={loading}
                empty={!loading && (leadTime?.sample ?? 0) === 0}
                emptyMessage="No bookings in this period to measure."
              />
              <Divider />
              <GroupedBarChart
                data={leadTime?.buckets ?? []}
                series={LEAD_TIME_SERIES}
                loading={loading}
                height={220}
              />
            </Stack>
          </AnalyticsChartCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <AnalyticsChartCard
            title="Booking outcomes"
            subtitle="Every booking you have taken"
            icon={<SegmentIcon />}
            accent="secondary"
            tables={pickTables(tables, 'Booking outcomes')}
            onExport={onExport}
          >
            <StackedShareBar data={pipeline?.statusMix ?? []} loading={loading} />
          </AnalyticsChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}
