import { Grid, Skeleton, Stack } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import { HALF_PERIOD, HeroStat, halfPeriodDelta } from '@sinnapi/ui/analytics';
import { formatMoney } from '@/lib/config';
import type { DashboardModel } from '../../schema';
import type { DashboardMedia } from '../../hooks/useDashboardMedia';
import ActionQueuesSection from './ActionQueuesSection';
import UpcomingBookings from './UpcomingBookings';
import ActivityFeed from './ActivityFeed';
import MediaShowcase from './MediaShowcase';

type Props = {
  data: DashboardModel | undefined;
  media: DashboardMedia;
  loading: boolean;
  periodLabel: string;
};

/**
 * Level 1 — everything a vendor needs within five seconds of landing: what they
 * earned, what is waiting on a reply, what they are committed to, and what just
 * changed.
 *
 * Nothing here needs interpretation. Analysis lives on the sibling tabs, which
 * keeps this panel to one headline, one card band and two lists instead of the
 * full chart stack.
 */
export default function OverviewPanel({ data, media, loading, periodLabel }: Props) {
  const earnings = data?.earnings;

  return (
    <Grid container spacing={3}>
      {/* Main column: the headline, then the work. Top-left carries priority. */}
      <Grid item xs={12} lg={8}>
        <Stack spacing={3}>
          {loading || !earnings ? (
            <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3 }} />
          ) : (
            <HeroStat
              label={`Paid out · ${periodLabel}`}
              value={earnings.released}
              format="money"
              delta={halfPeriodDelta(earnings.trend, 'released')}
              comparisonLabel={HALF_PERIOD.label}
              comparisonHint={HALF_PERIOD.hint}
              caption={`${formatMoney(earnings.inEscrow)} held in escrow · ${formatMoney(
                earnings.pendingPayout,
              )} awaiting settlement`}
              accent="success"
              icon={<PaymentsIcon />}
              trend={earnings.trend}
              trendKey="released"
            />
          )}

          <ActionQueuesSection queues={data?.queues ?? []} loading={loading} />

          {/* Under the queues, not above them: a reply someone is waiting on
              outranks housekeeping. It is in the main column all the same,
              because a listing with no pictures is the one gap on a profile that
              no amount of pricing or availability work makes up for — and until
              now the only route to it was the ninth item in the sidebar. */}
          <MediaShowcase media={media} />
        </Stack>
      </Grid>

      {/* Side column: what is ahead, then what just moved. Stacks under the main
          column below `lg`, so a phone reads priority top to bottom. */}
      <Grid item xs={12} lg={4}>
        <Stack spacing={3}>
          <UpcomingBookings
            upcoming={data?.upcoming ?? []}
            pipelineValue={formatMoney(data?.pipeline.upcomingValue ?? 0)}
            loading={loading}
          />
          <ActivityFeed activity={data?.activity ?? []} loading={loading} />
        </Stack>
      </Grid>
    </Grid>
  );
}
