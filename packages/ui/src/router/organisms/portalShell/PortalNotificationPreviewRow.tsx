'use client';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { formatRelativeTime } from '../../../messaging';
import { NotificationIcon } from '../../../notifications';
import type { NotificationView } from '../../../notifications';

export type PortalNotificationPreviewRowProps = {
  notification: NotificationView;
  onOpen: (notification: NotificationView) => void;
};

/**
 * One notification, compressed to a top-bar row.
 *
 * The feed's own `NotificationRow` carries a checkbox, an overflow menu and a
 * domain chip — a working surface for triage. This is the glance version: the
 * domain survives as the tinted glyph, everything else goes, and the row does
 * exactly one thing when clicked.
 */
export function PortalNotificationPreviewRow({
  notification,
  onOpen,
}: PortalNotificationPreviewRowProps) {
  const { unread, domain } = notification;

  return (
    <ButtonBase
      onClick={() => onOpen(notification)}
      aria-label={`Open notification: ${notification.headline}${unread ? ', unread' : ''}`}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        px: 1.25,
        py: 1.25,
        borderRadius: 2,
        borderLeft: 3,
        borderColor: unread ? `${domain.accent}.main` : 'transparent',
        bgcolor: unread ? 'action.hover' : 'transparent',
        transition: 'background-color 120ms ease',
        '&:hover, &:focus-visible': { bgcolor: 'action.selected' },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <NotificationIcon domain={domain} size={36} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography
              variant="body2"
              noWrap
              sx={{ flex: 1, minWidth: 0, fontWeight: unread ? 700 : 500 }}
            >
              {notification.headline}
            </Typography>
            <Typography
              variant="caption"
              color={unread ? 'text.primary' : 'text.secondary'}
              sx={{ whiteSpace: 'nowrap', fontWeight: unread ? 600 : 400 }}
            >
              {formatRelativeTime(notification.createdAt) || '—'}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
            <Typography
              variant="caption"
              color={notification.body ? 'text.secondary' : 'text.disabled'}
              sx={{
                flex: 1,
                minWidth: 0,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                fontStyle: notification.body ? 'normal' : 'italic',
              }}
            >
              {notification.body ?? domain.label}
            </Typography>
            {unread && (
              <Box
                aria-hidden
                sx={{
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: `${domain.accent}.main`,
                }}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </ButtonBase>
  );
}
