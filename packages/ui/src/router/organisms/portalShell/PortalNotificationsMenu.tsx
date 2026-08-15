'use client';
import { useMemo } from 'react';
import { IconButton, Stack, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { PortalAlertsToggle } from './PortalAlertsToggle';
import { PortalBadgeButton } from './PortalBadgeButton';
import { PortalMenuFooterLink } from './PortalMenuFooterLink';
import { PortalMenuEmpty, PortalMenuError, PortalMenuSkeleton } from './PortalMenuStates';
import { PortalMenuPanel } from './PortalMenuPanel';
import { PortalNotificationPreviewRow } from './PortalNotificationPreviewRow';
import { previewNotifications, unreadSummary } from './menuPreview';
import { useBadgeMenu } from './hooks/useBadgeMenu';
import { useUnreadPulse } from './hooks/useUnreadPulse';
import type { PortalNotificationsFeed } from './types';
import type { NotificationView } from '../../../notifications';

export type PortalNotificationsMenuProps = {
  feed: PortalNotificationsFeed;
};

/**
 * The bell, as the twin of the message centre.
 *
 * Deliberately the same object in a different colour: same badge button, same
 * panel, same preview-then-hand-off contract. Two adjacent icons that behave
 * differently — one opening a panel, one navigating away — is the kind of
 * inconsistency people never articulate and always feel.
 *
 * "Mark all read" lives in the header rather than on each row. Triage belongs
 * to the notification centre; the one bulk action worth having here is the one
 * that clears a badge the user has already decided they do not care about.
 */
export function PortalNotificationsMenu({ feed }: PortalNotificationsMenuProps) {
  const menu = useBadgeMenu({ onOpen: feed.onOpen });
  const pulse = useUnreadPulse(feed.unread);

  const rows = useMemo(() => previewNotifications(feed.notifications), [feed.notifications]);

  const open = (notification: NotificationView) => {
    menu.onClose();
    feed.onSelect(notification);
  };

  return (
    <>
      <PortalBadgeButton
        icon={feed.unread > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        label="Notifications"
        count={feed.unread}
        color="error"
        open={menu.open}
        pulse={pulse}
        onClick={menu.onOpen}
      />

      <PortalMenuPanel
        anchorEl={menu.anchor}
        open={menu.open}
        onClose={menu.onClose}
        title="Notifications"
        subtitle={unreadSummary(feed.unread, 'notification', 'notifications')}
        headerAction={
          <Stack direction="row" spacing={0.5} alignItems="center">
            {feed.alerts && <PortalAlertsToggle alerts={feed.alerts} subject="new notifications" />}
            {feed.onMarkAllRead && feed.unread > 0 && (
              <Tooltip title="Mark all as read">
                <span>
                  <IconButton
                    size="small"
                    onClick={feed.onMarkAllRead}
                    disabled={feed.markingAll}
                    aria-label="Mark all notifications as read"
                  >
                    <DoneAllIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        }
        footer={
          <PortalMenuFooterLink
            to={feed.to}
            label="View all notifications"
            onNavigate={menu.onClose}
          />
        }
      >
        <PortalNotificationsMenuBody feed={feed} rows={rows} onOpen={open} />
      </PortalMenuPanel>
    </>
  );
}

/** Error before loading before empty — the same order the message panel uses. */
function PortalNotificationsMenuBody({
  feed,
  rows,
  onOpen,
}: {
  feed: PortalNotificationsFeed;
  rows: NotificationView[];
  onOpen: (notification: NotificationView) => void;
}) {
  if (feed.error) return <PortalMenuError message="Your notifications could not be loaded." />;
  if (feed.isLoading && rows.length === 0) return <PortalMenuSkeleton />;
  if (rows.length === 0) {
    return (
      <PortalMenuEmpty
        icon={<NotificationsNoneIcon />}
        title="Nothing to catch up on"
        description="Alerts about bookings, payments and messages land here."
      />
    );
  }

  return (
    <Stack spacing={0.25}>
      {rows.map((notification) => (
        <PortalNotificationPreviewRow
          key={notification.id}
          notification={notification}
          onOpen={onOpen}
        />
      ))}
    </Stack>
  );
}
