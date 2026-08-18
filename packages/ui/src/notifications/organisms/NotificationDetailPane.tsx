'use client';
import { Box, Stack, Typography, Chip, Button, IconButton, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { NotificationIcon } from '../molecules/NotificationIcon';
import { formatNotificationTimestamp } from '../format';
import { formatRelativeTime } from '../../messaging/format';
import type { NotificationTarget, NotificationView } from '../types';

export type NotificationDetailPaneProps = {
  notification: NotificationView | null;
  onClose: () => void;
  /** Where the record lives, when the host portal surfaces one. */
  target: NotificationTarget | null;
  onOpenTarget: (target: NotificationTarget) => void;
  onMarkUnread: (notification: NotificationView) => void;
  busy?: boolean;
};

/** Resting state on desktop, where the pane is always mounted beside the feed. */
function Placeholder() {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ flex: 1, py: 6 }}>
      <NotificationsNoneIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
      <Typography variant="h6" color="text.primary">
        Select a notification
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 320, textAlign: 'center' }}
      >
        Open one from the list to read it in full and jump straight to what it is about.
      </Typography>
    </Stack>
  );
}

/**
 * The detail column: the notification in full, when it arrived, and the way
 * through to the record it concerns.
 *
 * Deliberately no raw `data` dump. The admin portal shows one because an admin
 * chasing a dispute needs the ids; a client reading "your booking is confirmed"
 * needs a button that opens the booking, and a table of uuids underneath it is
 * only noise. The payload is still put to work — it is what resolves the CTA.
 *
 * "Mark as unread" lives here as well as in the row menu, because opening a
 * notification is what marks it read: without an undo at exactly that spot, a
 * reader who opened something they cannot deal with yet has no way to put it
 * back.
 */
export function NotificationDetailPane({
  notification,
  onClose,
  target,
  onOpenTarget,
  onMarkUnread,
  busy,
}: NotificationDetailPaneProps) {
  if (!notification) return <Placeholder />;

  const { domain } = notification;

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <NotificationIcon domain={domain} size={48} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
            {notification.headline}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: 0.5 }}
          >
            <Chip
              size="small"
              label={domain.label}
              color={domain.accent}
              sx={{ height: 20, fontSize: 11 }}
            />
            {notification.unread && (
              <Chip
                size="small"
                label="Unread"
                variant="outlined"
                sx={{ height: 20, fontSize: 11 }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(notification.createdAt) || '—'}
            </Typography>
          </Stack>
        </Box>
        <IconButton onClick={onClose} aria-label="Close notification" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
        <Typography
          variant="body1"
          color={notification.body ? 'text.primary' : 'text.disabled'}
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontStyle: notification.body ? 'normal' : 'italic',
          }}
        >
          {notification.body ?? 'This notification carries no further detail.'}
        </Typography>

        <Stack spacing={0.25} sx={{ mt: 3 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.5px' }}>
            Received
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatNotificationTimestamp(notification.createdAt)}
          </Typography>
          {notification.readAt && (
            <Typography variant="caption" color="text.disabled">
              Read {formatNotificationTimestamp(notification.readAt)}
            </Typography>
          )}
        </Stack>
      </Box>

      <Divider sx={{ mt: 2 }} />
      <Stack direction="row" spacing={1} sx={{ pt: 2 }}>
        {target && (
          <Button
            onClick={() => onOpenTarget(target)}
            variant="contained"
            fullWidth
            endIcon={<LaunchIcon />}
          >
            {target.label}
          </Button>
        )}
        {!notification.unread && (
          <Button
            onClick={() => onMarkUnread(notification)}
            variant="outlined"
            disabled={busy}
            fullWidth={!target}
            startIcon={<MarkEmailUnreadIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Unread
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
