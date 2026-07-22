import { Box, Grid, Skeleton, Stack } from '@sinnapi/ui';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PaymentsIcon from '@mui/icons-material/Payments';
import InboxIcon from '@mui/icons-material/Inbox';
import HeroStat from '@/components/analytics/HeroStat';
import type { DashboardModel, SectionKey } from '../../schema';
import ActionQueuesSection from './ActionQueuesSection';
import ActivityFeed from './ActivityFeed';

type Props = {
  data: DashboardModel | undefined;
  loading: boolean;
  canSee: (key: SectionKey) => boolean;
};

// The hero's icon follows whichever metric was chosen for this admin.
const HERO_ICONS = {
  mrr: <AutorenewIcon />,
  revenue: <PaymentsIcon />,
  workload: <InboxIcon />,
};

/**
 * Level 1 — everything an admin needs within five seconds of landing: the one
 * headline figure, what is waiting on them, and what just changed.
 *
 * Nothing here needs interpretation. Analysis lives on the sibling tabs, which
 * keeps this panel to a single headline, one card band and one list instead of
 * the eleven-chart scroll it replaced.
 */
export default function OverviewPanel({ data, loading, canSee }: Props) {
  const hero = data?.hero;
  const showActivity = canSee('activity');

  return (
    <Grid container spacing={3}>
      {/* Main column: headline, then the work. Top-left carries the priority. */}
      <Grid item xs={12} lg={showActivity ? 8 : 12}>
        <Stack spacing={3}>
          {loading ? (
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
          ) : (
            hero && (
              <HeroStat
                label={hero.label}
                value={hero.value}
                format={hero.format}
                delta={hero.delta}
                comparisonLabel={hero.comparisonLabel}
                caption={hero.caption ?? undefined}
                accent={hero.accent}
                icon={HERO_ICONS[hero.kind]}
                trend={hero.trend.length ? hero.trend : undefined}
                trendKey={hero.trendKey}
              />
            )
          )}

          {canSee('queues') && (
            <ActionQueuesSection queues={data?.queues ?? []} loading={loading} />
          )}
        </Stack>
      </Grid>

      {showActivity && (
        <Grid item xs={12} lg={4}>
          <Box sx={{ height: '100%' }}>
            <ActivityFeed activity={data?.activity ?? null} loading={loading} />
          </Box>
        </Grid>
      )}
    </Grid>
  );
}
