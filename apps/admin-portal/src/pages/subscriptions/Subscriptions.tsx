import { useCallback } from 'react';
import { DataTable, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import { useSubscriptions } from './hooks/useSubscriptions';
import { subscriptionColumns, type SubscriptionTabValue } from './schema';
import SubscriptionsToolbar from './components/organisms/SubscriptionsToolbar';

export default function Subscriptions() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    emptyMessage,
    tabs,
    countsLoading,
    tab,
    onTabChange,
    search,
    filters,
    planOptions,
    table,
  } = useSubscriptions();

  const pageError = error
    ? error instanceof Error
      ? error.message
      : 'Failed to load subscriptions.'
    : null;

  // Selecting a tab drives a fresh server fetch: the chosen status is written to
  // the URL and flows into the query params as `p_status` for
  // `search_subscriptions_admin` (and the counts RPC), so the list and badges
  // reload for that status from page 1 — no client-side filtering.
  const handleTabChange = useCallback(
    (next: SubscriptionTabValue) => onTabChange(next),
    [onTabChange],
  );

  return (
    <>
      <PageTitle
        title="Subscriptions"
        subtitle="Monitor vendor subscriptions, trials, and grace periods."
      />

      <StatusTabs
        options={tabs}
        value={tab}
        onChange={handleTabChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter subscriptions by status"
      />
      <SubscriptionsToolbar search={search} filters={filters} planOptions={planOptions} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}
      <DataTable
        columns={subscriptionColumns}
        rows={rows}
        getRowId={(s) => s.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={emptyMessage}
        {...table.controls}
      />
    </>
  );
}
