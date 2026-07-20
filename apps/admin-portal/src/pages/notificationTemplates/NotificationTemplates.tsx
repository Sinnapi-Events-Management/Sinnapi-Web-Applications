import { Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import { useNotificationTemplates } from './hooks/useNotificationTemplates';
import TemplatesSummary from './components/organisms/TemplatesSummary';
import TemplatesToolbar from './components/organisms/TemplatesToolbar';
import TemplatesTable from './components/organisms/TemplatesTable';

export default function NotificationTemplates() {
  const {
    rows,
    total,
    stats,
    statsLoading,
    isLoading,
    isFetching,
    pageError,
    emptyMessage,
    tabs,
    channelTab,
    onChannelChange,
    search,
    busyId,
    toggle,
    table,
  } = useNotificationTemplates();

  return (
    <>
      <PageTitle
        title="Notification templates"
        subtitle="Email / in-app templates per trigger key and locale."
      />

      <TemplatesSummary stats={stats} loading={statsLoading} />

      <StatusTabs
        options={tabs}
        value={channelTab}
        onChange={onChannelChange}
        loadingCounts={statsLoading}
        ariaLabel="Filter notification templates by channel"
      />

      <TemplatesToolbar search={search} resultCount={rows.length} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <TemplatesTable
        rows={rows}
        total={total}
        loading={isLoading || isFetching}
        emptyMessage={emptyMessage}
        controls={table.controls}
        busyId={busyId}
        onToggle={toggle}
      />
    </>
  );
}
