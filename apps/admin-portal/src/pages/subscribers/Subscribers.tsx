import { Alert, DataTable, PageTitle, Typography } from '@sinnapi/ui';
import StatusTabs from '@/components/ui/StatusTabs';
import { useSubscribers } from './hooks/useSubscribers';
import { SUBSCRIPTION_COLUMNS, SUPPRESSION_COLUMNS } from './schema/Columns';
import SubscribersSummary from './components/organisms/SubscribersSummary';
import SubscribersToolbar from './components/organisms/SubscribersToolbar';

export default function Subscribers() {
  const api = useSubscribers();

  return (
    <>
      <PageTitle
        title="Newsletter subscribers"
        subtitle="Who has consented to marketing email, when they agreed, and which addresses can no longer be mailed."
      />

      <SubscribersSummary counts={api.counts} loading={api.countsLoading} />

      <StatusTabs
        options={api.tabs}
        value={api.tab}
        onChange={api.changeTab}
        loadingCounts={api.countsLoading}
        ariaLabel="Switch between subscriptions and suppressed addresses"
      />

      <SubscribersToolbar
        search={api.search}
        statusValue={api.statusValue}
        onStatusChange={api.onStatusChange}
        showStatusFilter={api.tab === 'subscriptions'}
      />

      {api.tab === 'suppressions' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These addresses are excluded from every campaign automatically. Bounces and spam
          complaints land here from the mail provider; unsubscribes land here when someone opts out
          of everything. They are not removed — a suppression that can be cleared is a suppression
          that will be.
        </Typography>
      )}

      {api.pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {api.pageError}
        </Alert>
      )}

      {api.tab === 'subscriptions' ? (
        <DataTable
          columns={SUBSCRIPTION_COLUMNS}
          rows={api.subscriptionRows}
          getRowId={(r) => r.id}
          rowCount={api.total}
          loading={api.isLoading}
          emptyMessage={api.emptyMessage}
          minWidth={860}
          {...api.table.controls}
        />
      ) : (
        <DataTable
          columns={SUPPRESSION_COLUMNS}
          rows={api.suppressionRows}
          getRowId={(r) => r.id}
          rowCount={api.total}
          loading={api.isLoading}
          emptyMessage={api.emptyMessage}
          minWidth={720}
          {...api.table.controls}
        />
      )}
    </>
  );
}
