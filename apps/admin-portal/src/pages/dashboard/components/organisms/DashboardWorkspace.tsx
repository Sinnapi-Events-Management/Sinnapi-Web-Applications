import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@sinnapi/ui';
import EmptyState from '@/components/ui/EmptyState';
import type { AnalyticsPeriod } from '@/lib/analytics';
import type { DashboardModel, DashboardTab, SectionKey, TabDef } from '../../schema';
import DashboardToolbar from './DashboardToolbar';
import DashboardTabs from './DashboardTabs';
import OverviewPanel from './OverviewPanel';
import SubscriptionsSection from './SubscriptionsSection';
import FinanceSection from './FinanceSection';
import GrowthSection from './GrowthSection';

type Props = {
  period: AnalyticsPeriod;
  onPeriodChange: (next: AnalyticsPeriod) => void;
  tab: DashboardTab;
  onTabChange: (next: DashboardTab) => void;
  tabs: TabDef[];
  activeTab: TabDef;
  attentionCount: number;
  data: DashboardModel | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: unknown;
  onRefresh: () => void;
  canSee: (key: SectionKey) => boolean;
  isEmpty: boolean;
};

/**
 * Page chrome and disclosure: the period toolbar, the tab bar, and whichever
 * panel is active.
 *
 * Only one panel mounts at a time. That is the point of the restructure — the
 * previous single scroll stacked every section at once, so an admin met eleven
 * charts before finding the two numbers they came for.
 */
export default function DashboardWorkspace({
  period,
  onPeriodChange,
  tab,
  onTabChange,
  tabs,
  activeTab,
  attentionCount,
  data,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  canSee,
  isEmpty,
}: Props) {
  if (isEmpty) {
    return (
      <EmptyState
        title="Nothing to show yet"
        description="Your admin role doesn't grant access to any dashboard section. Ask an owner to review your permissions."
        ctaLabel="View your messages"
        ctaHref="/messages"
      />
    );
  }

  return (
    <>
      <DashboardToolbar
        period={period}
        onPeriodChange={onPeriodChange}
        generatedAt={data?.generatedAt}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
      />

      <DashboardTabs
        tabs={tabs}
        value={tab}
        onChange={onTabChange}
        attentionCount={attentionCount || undefined}
      />

      {/* One line naming what the active panel answers, plus its single "go
          deeper" link — the third and last level of type hierarchy on the page.
          Both used to be repeated inside every panel's own heading. */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
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
          {error instanceof Error ? error.message : 'Could not load the dashboard.'}
        </Alert>
      ) : (
        <Box>
          {tab === 'overview' && <OverviewPanel data={data} loading={isLoading} canSee={canSee} />}
          {tab === 'subscriptions' && (
            <SubscriptionsSection subscriptions={data?.subscriptions ?? null} loading={isLoading} />
          )}
          {tab === 'revenue' && (
            <FinanceSection finance={data?.finance ?? null} loading={isLoading} />
          )}
          {tab === 'growth' && <GrowthSection growth={data?.growth ?? null} loading={isLoading} />}
        </Box>
      )}
    </>
  );
}
