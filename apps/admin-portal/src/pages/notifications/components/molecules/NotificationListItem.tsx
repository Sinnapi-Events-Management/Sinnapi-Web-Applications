import { Box, Stack, Typography, Chip, CardActionArea } from '@sinnapi/ui';
import { formatRelative } from '@/lib/config';
import type { NotificationView } from '../../hooks/useNotifications';
import NotificationIcon from './NotificationIcon';

type Props = {
  notification: NotificationView;
  /** The row currently open in the detail pane. */
  active: boolean;
  onOpen: (notification: NotificationView) => void;
};

/**
 * One feed row: what happened, the detail, and how long ago. Unread rows carry a
 * bolder headline, a left rail and a dot; the open row reads as selected.
 * Purely presentational — all state comes from the page's hooks.
 */
export default function NotificationListItem({ notification, active, onOpen }: Props) {
  const { unread, domain } = notification;

  return (
    <CardActionArea
      onClick={() => onOpen(notification)}
      aria-label={`Open notification: ${notification.headline}`}
      aria-current={active ? 'true' : undefined}
      sx={{
        display: 'block',
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: active ? 'primary.main' : 'divider',
        borderLeftWidth: 3,
        borderLeftColor: unread ? `${domain.accent}.main` : 'transparent',
        bgcolor: active ? 'action.selected' : 'background.paper',
        boxShadow: active ? 2 : 0,
        transition: 'box-shadow 120ms ease, border-color 120ms ease, background-color 120ms ease',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <NotificationIcon domain={domain} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography
              variant="subtitle2"
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
              {formatRelative(notification.createdAt)}
            </Typography>
          </Stack>

          <Typography
            variant="body2"
            color={notification.body ? 'text.secondary' : 'text.disabled'}
            sx={{
              mt: 0.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              fontStyle: notification.body ? 'normal' : 'italic',
              fontWeight: unread ? 500 : 400,
            }}
          >
            {notification.body ?? 'No further detail'}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
            <Chip
              size="small"
              label={domain.label}
              color={domain.accent}
              variant={unread ? 'filled' : 'outlined'}
              sx={{ height: 20, fontSize: 11 }}
            />
            <Box sx={{ flex: 1 }} />
            {unread && (
              <Box
                aria-label="Unread"
                sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${domain.accent}.main` }}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </CardActionArea>
  );
}
