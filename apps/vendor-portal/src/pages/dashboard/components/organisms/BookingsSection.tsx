import { Box, Grid, Stack } from '@sinnapi/ui';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SegmentIcon from '@mui/icons-material/Segment';
import {
  ChartCard,
  GroupedBarChart,
  KpiRow,
  StackedShareBar,
  halfPeriodDelta,
  type Kpi,
  type SeriesDef,
} from '@sinnapi/ui/analytics';
import type { PipelineModel } from '../../schema';
import { WinRateMeter } from '@/components/metrics';

type Props = {
  pipeline: PipelineModel | undefined;
  loading: boolean;
};

const VOLUME_SERIES: SeriesDef[] = [
  { key: 'quotations', label: 'Quote requests', color: 'secondary' },
  { key: 'bookings', label: 'Bookings', color: 'primary' },
];

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
 * Demand and what became of it. Volume is counted per bucket as bars — discrete
 * events, so bars rather than the area used for money — and the two outcome
 * reads (win rate, lifetime status split) sit beside it in the narrow column.
 */
export default function BookingsSection({ pipeline, loading }: Props) {
  const kpis = pipeline ? toKpis(pipeline) : [];

  return (
    <Box component="section">
      <KpiRow kpis={kpis} loading={loading} comparisonLabel="vs first half" />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard
            title="Requests and bookings"
            subtitle="Incoming demand against the work you took on"
            icon={<BarChartIcon />}
            accent="primary"
          >
            <GroupedBarChart
              data={pipeline?.trend ?? []}
              series={VOLUME_SERIES}
              loading={loading}
              legend
              height={320}
            />
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <ChartCard
              title="Win rate"
              subtitle="Quotes answered in this period"
              icon={<EmojiEventsIcon />}
              accent="success"
            >
              <WinRateMeter
                winRate={pipeline?.winRate ?? null}
                accepted={pipeline?.quotesAccepted ?? 0}
                answered={pipeline?.quotesAnswered ?? 0}
                loading={loading}
              />
            </ChartCard>

            <ChartCard
              title="Booking outcomes"
              subtitle="Every booking you have taken"
              icon={<SegmentIcon />}
              accent="info"
            >
              <StackedShareBar data={pipeline?.statusMix ?? []} loading={loading} />
            </ChartCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
