import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@sinnapi/ui';
import type { AnalyticsPeriod } from '@sinnapi/ui/analytics';
import type { DashboardModel, DashboardTab, TabDef } from '../../schema';
import type { DashboardMedia } from '../../hooks/useDashboardMedia';
import { MetricsToolbar } from '@/components/metrics';
import { AddMediaFab } from '@/components/media';
import DashboardTabs from './DashboardTabs';
import OverviewPanel from './OverviewPanel';
import EarningsSection from './EarningsSection';
import BookingsSection from './BookingsSection';
import ReputationSection from './ReputationSection';

type Props = {
  period: AnalyticsPeriod;
  onPeriodChange: (next: AnalyticsPeriod) => void;
  periodLabel: string;
  tab: DashboardTab;
  onTabChange: (next: DashboardTab) => void;
  tabs: TabDef[];
  activeTab: TabDef;
  attentionCount: number;
  /** The listing's photos and videos, for the Overview panel's gallery card. */
  media: DashboardMedia;
  data: DashboardModel | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: unknown;
  onRefresh: () => void;
};

/**
 * Page chrome and disclosure: the period toolbar, the tab bar, and whichever
 * panel is active.
 *
 * Only one panel mounts at a time — that is the point of the tabs. Stacking
 * every chart in a single scroll would put analysis in front of the two numbers
 * a vendor opened the portal for.
 */
export default function DashboardWorkspace({
  period,
  onPeriodChange,
  periodLabel,
  tab,
  onTabChange,
  tabs,
  activeTab,
  attentionCount,
  media,
  data,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
}: Props) {
  return (
    <>
      <MetricsToolbar
        period={period}
        onPeriodChange={onPeriodChange}
        generatedAt={data?.generatedAt}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        surfaceLabel="Dashboard"
        showAddMedia
      />

      {/* Mounted here rather than inside the toolbar: it is fixed to the
          viewport, and the toolbar's backdrop-filtered Paper would become its
          containing block. Phone-only, and it waits for the bar's own button to
          scroll away — see `AddMediaFab`. */}
      <AddMediaFab />

      <DashboardTabs
        tabs={tabs}
        value={tab}
        onChange={onTabChange}
        attentionCount={attentionCount || undefined}
      />

      {/* One line naming what the active panel answers, plus its single "go
          deeper" link — the last level of type hierarchy on the page. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 3 }}
      >
        <Typography variant="body2" color="text.secondary">
          {activeTab.description}
        </Typography>
        {activeTab.link && (
          <Button
            component={RouterLink}
            to={activeTab.link.to}
            size="small"
            sx={{ textTransform: 'none', flexShrink: 0 }}
          >
            {activeTab.link.label}
          </Button>
        )}
      </Stack>

      {error ? (
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Could not load your dashboard.'}
        </Alert>
      ) : (
        <Box>
          {tab === 'overview' && (
            <OverviewPanel
              data={data}
              media={media}
              loading={isLoading}
              periodLabel={periodLabel}
            />
          )}
          {tab === 'earnings' && <EarningsSection earnings={data?.earnings} loading={isLoading} />}
          {tab === 'bookings' && <BookingsSection pipeline={data?.pipeline} loading={isLoading} />}
          {tab === 'reputation' && (
            <ReputationSection reputation={data?.reputation} loading={isLoading} />
          )}
        </Box>
      )}
    </>
  );
}
