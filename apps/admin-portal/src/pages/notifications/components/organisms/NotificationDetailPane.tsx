import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, Chip, Button, IconButton, Divider } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useAdmin } from '@/admin/AdminProvider';
import { formatDateTime, formatRelative } from '@/lib/config';
import NotificationIcon from '../molecules/NotificationIcon';
import PayloadPanel from '../molecules/PayloadPanel';
import type { NotificationView } from '../../hooks/useNotifications';

type Props = {
  notification: NotificationView | null;
  onClose: () => void;
};

/** Resting state on desktop, where the pane is always mounted beside the list. */
function Placeholder() {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ flex: 1, py: 6 }}>
      <NotificationsNoneIcon sx={{ fontSize: 44, color: 'grey.400' }} />
      <Typography variant="h6" color="text.primary">
        Select a notification
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 320, textAlign: 'center' }}
      >
        Open one from the list to read it in full and jump to the record it concerns.
      </Typography>
    </Stack>
  );
}

/**
 * The detail column: the notification in full, its context payload, and a link
 * to the section it concerns.
 *
 * The CTA opens the *section*, not the record — the portal has no per-record
 * routes for the finance domains these alerts come from. It is hidden outright
 * when the admin lacks the permission guarding that route, so the link can never
 * dead-end on the "Not authorized" screen.
 */
export default function NotificationDetailPane({ notification, onClose }: Props) {
  const { has } = useAdmin();

  if (!notification) return <Placeholder />;

  const { domain } = notification;
  const canOpenTarget = !!domain.route && (!domain.perm || has(domain.perm));

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
              {formatRelative(notification.createdAt)}
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
          variant="body2"
          color={notification.body ? 'text.primary' : 'text.disabled'}
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontStyle: notification.body ? 'normal' : 'italic',
          }}
        >
          {notification.body ?? 'This notification carries no further detail.'}
        </Typography>

        <Box sx={{ mt: 3 }}>
          <PayloadPanel data={notification.data} />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.5px' }}>
            Delivery
          </Typography>
          <Stack spacing={0.25} sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Received {formatDateTime(notification.createdAt)}
            </Typography>
            {notification.readAt && (
              <Typography variant="caption" color="text.secondary">
                Read {formatDateTime(notification.readAt)}
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
            >
              {notification.triggerKey} · {notification.channel}
            </Typography>
          </Stack>
        </Box>
      </Box>

      {canOpenTarget && (
        <>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ pt: 2 }}>
            <Button
              component={RouterLink}
              to={domain.route as string}
              variant="contained"
              fullWidth
              endIcon={<LaunchIcon />}
            >
              Open {domain.label}
            </Button>
          </Box>
        </>
      )}
    </Stack>
  );
}
