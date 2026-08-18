import { Stack } from '@sinnapi/ui';
import { NotificationsToolbar, NotificationFeed } from '@sinnapi/ui/notifications';
import { resolveTarget } from '../../schema';
import type { useNotifications } from '../../hooks/useNotifications';

type Props = {
  page: ReturnType<typeof useNotifications>;
};

/**
 * The left column — toolbar above feed.
 *
 * It exists so `Notifications.tsx` stays a page rather than a layout: the two
 * columns are each a handful of props deep, and inlining both left the page
 * component doing prop-threading instead of describing the screen.
 */
export default function NotificationsMasterColumn({ page }: Props) {
  const { feed } = page;

  return (
    <Stack spacing={2}>
      <NotificationsToolbar
        search={feed.search}
        domainFilter={feed.domainFilter}
        availableDomains={feed.availableDomains}
        resultCount={feed.rows.length}
        alerts={page.alerts}
        chime={page.chime}
      />
      <NotificationFeed
        groups={feed.groups}
        isLoading={page.isLoading}
        error={page.error}
        tab={feed.tab}
        isFiltered={feed.isFiltered}
        paging={page.paging}
        selection={feed.selection}
        arrivals={page.arrivals}
        activeId={page.active.active?.id ?? null}
        onOpen={page.active.open}
        onToggleRead={page.toggleRead}
        onMarkRead={page.markSelectedRead}
        onMarkUnread={page.markSelectedUnread}
        resolveTarget={resolveTarget}
        onOpenTarget={page.openTarget}
        busy={page.actions.busy}
      />
    </Stack>
  );
}
