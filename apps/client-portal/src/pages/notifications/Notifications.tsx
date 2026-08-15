import { Button, PageTitle, Snackbar, Alert } from '@sinnapi/ui';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import {
  NotificationsSummary,
  NotificationTabs,
  NotificationsWorkspace,
  NotificationDetailPane,
  buildNotificationTabs,
} from '@sinnapi/ui/notifications';
import { useNotifications } from './hooks/useNotifications';
import { resolveTarget } from './schema';
import NotificationsMasterColumn from './components/organisms/NotificationsMasterColumn';

export default function Notifications() {
  const page = useNotifications();
  const { feed, counts, actions, active } = page;

  return (
    <>
      <PageTitle
        title="Notifications"
        subtitle="Updates about your bookings, quotes, payments and messages."
        action={
          counts.unread > 0 ? (
            <Button
              onClick={actions.markAll}
              disabled={actions.markingAll}
              startIcon={<DoneAllIcon />}
              variant="outlined"
            >
              {actions.markingAll ? 'Marking…' : 'Mark all read'}
            </Button>
          ) : undefined
        }
      />

      <NotificationsSummary counts={counts} loading={page.countsLoading} />

      <NotificationTabs
        options={buildNotificationTabs(counts)}
        value={feed.tab}
        onChange={feed.setTab}
        loadingCounts={page.countsLoading}
      />

      <NotificationsWorkspace
        master={<NotificationsMasterColumn page={page} />}
        detailOpen={!!active.active}
        onCloseDetail={active.close}
        detail={
          <NotificationDetailPane
            notification={active.active}
            onClose={active.close}
            target={active.active ? resolveTarget(active.active) : null}
            onOpenTarget={page.openTarget}
            onMarkUnread={page.toggleRead}
            busy={actions.busy}
          />
        }
      />

      {/* A failed read-state write must not pass silently — the row would snap
          back on the next refetch with no explanation. */}
      <Snackbar
        open={!!actions.error}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled">
          Could not update that notification. Please try again.
        </Alert>
      </Snackbar>
    </>
  );
}
