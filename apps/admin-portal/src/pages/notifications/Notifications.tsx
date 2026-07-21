import { Stack, Button } from '@sinnapi/ui';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import { useNotifications } from './hooks/useNotifications';
import { useActiveNotification } from './hooks/useActiveNotification';
import { buildNotificationTabs } from './schema';
import NotificationsSummary from './components/organisms/NotificationsSummary';
import NotificationsToolbar from './components/organisms/NotificationsToolbar';
import NotificationsWorkspace from './components/organisms/NotificationsWorkspace';
import NotificationList from './components/organisms/NotificationList';
import NotificationDetailPane from './components/organisms/NotificationDetailPane';

export default function Notifications() {
  const {
    rows,
    groups,
    counts,
    availableDomains,
    isLoading,
    countsLoading,
    error,
    tab,
    setTab,
    domainFilter,
    search,
    paging,
    markAll,
    markingAll,
    isFiltered,
  } = useNotifications();

  const active = useActiveNotification();

  const master = (
    <Stack spacing={2}>
      <NotificationsToolbar
        search={search}
        domainFilter={domainFilter}
        availableDomains={availableDomains}
        resultCount={rows.length}
      />
      <NotificationList
        groups={groups}
        isLoading={isLoading}
        error={error}
        tab={tab}
        isFiltered={isFiltered}
        paging={paging}
        active={active}
      />
    </Stack>
  );

  return (
    <>
      <PageTitle
        title="Notifications"
        subtitle="Alerts raised by bookings, payments and compliance across the platform."
        action={
          counts.unread > 0 ? (
            <Button
              onClick={markAll}
              disabled={markingAll}
              startIcon={<DoneAllIcon />}
              variant="outlined"
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </Button>
          ) : undefined
        }
      />

      <NotificationsSummary counts={counts} loading={countsLoading} />

      <StatusTabs
        options={buildNotificationTabs(counts)}
        value={tab}
        onChange={setTab}
        loadingCounts={countsLoading}
        ariaLabel="Filter notifications by read state"
      />

      <NotificationsWorkspace
        master={master}
        detailOpen={!!active.active}
        onCloseDetail={active.close}
        detail={<NotificationDetailPane notification={active.active} onClose={active.close} />}
      />
    </>
  );
}
