import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@sinnapi/ui';
import type { useAnalytics } from '../../hooks/useAnalytics';
import AnalyticsToolbar from './AnalyticsToolbar';
import AnalyticsTabs from './AnalyticsTabs';
import InsightStrip from './InsightStrip';
import AnalyticsErrorCard from './AnalyticsErrorCard';
import EarningsPanel from './EarningsPanel';
import DemandPanel from './DemandPanel';
import ClientsPanel from './ClientsPanel';
import ReputationPanel from './ReputationPanel';

type Props = ReturnType<typeof useAnalytics>;

/**
 * Page chrome and disclosure: the toolbar, the findings, the tab bar, and
 * whichever panel is active.
 *
 * Only one panel mounts at a time — that is the point of the tabs. The four
 * stacked into one scroll is what the previous version of this page did, and
 * it produced eleven peer KPI tiles with nothing between them to say where one
 * analysis ended and the next began.
 *
 * Takes the page hook's return value whole rather than fifteen props: it is one
 * cohesive state object with one owner, and spreading it across a prop list
 * here would only mean re-declaring the same shape twice.
 */
export default function AnalyticsWorkspace({
  period,
  setPeriod,
  tabs,
  tab,
  activeTab,
  setTab,
  overview,
  detail,
  insights,
  tables,
  exportTables,
  isLoading,
  isRefreshing,
  error,
  refresh,
}: Props) {
  // Every table on the page, for the toolbar's whole-report export.
  const allTables = Object.values(tables).flat();
  const panelTables = tables[tab];

  return (
    <>
      <AnalyticsToolbar
        period={period}
        onPeriodChange={setPeriod}
        generatedAt={overview?.generatedAt}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        tables={allTables}
        onExport={exportTables}
      />

      {error ? (
        <AnalyticsErrorCard error={error} onRetry={refresh} isRetrying={isRefreshing} />
      ) : (
        <>
          <InsightStrip insights={insights} loading={isLoading} />

          <AnalyticsTabs
            tabs={tabs}
            value={tab}
            onChange={setTab}
            unansweredReviews={overview?.reputation.unanswered || undefined}
          />

          {/* One line naming what the active panel answers, plus its single
              "act on this" link — the last level of type hierarchy on the page. */}
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

          <Box>
            {tab === 'earnings' && (
              <EarningsPanel
                earnings={overview?.earnings}
                loading={isLoading}
                tables={panelTables}
                onExport={exportTables}
              />
            )}
            {tab === 'demand' && (
              <DemandPanel
                pipeline={overview?.pipeline}
                leadTime={detail?.leadTime}
                speed={detail?.speed}
                loading={isLoading}
                tables={panelTables}
                onExport={exportTables}
              />
            )}
            {tab === 'clients' && (
              <ClientsPanel
                detail={detail}
                loading={isLoading}
                tables={panelTables}
                onExport={exportTables}
              />
            )}
            {tab === 'reputation' && (
              <ReputationPanel
                reputation={overview?.reputation}
                speed={detail?.speed}
                loading={isLoading}
                tables={panelTables}
                onExport={exportTables}
              />
            )}
          </Box>
        </>
      )}
    </>
  );
}
