'use client';
import { Box, Stack, Typography, Chip, Checkbox, ButtonBase } from '@mui/material';
import { formatRelativeTime } from '../../messaging/format';
import { NotificationIcon } from './NotificationIcon';
import { NotificationRowMenu } from './NotificationRowMenu';
import type { NotificationTarget, NotificationView } from '../types';

export type NotificationRowProps = {
  notification: NotificationView;
  /** The row currently open in the detail pane. */
  active: boolean;
  onOpen: (notification: NotificationView) => void;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  /** True once any row is selected — checkboxes stay visible in that mode. */
  selectionActive: boolean;
  onToggleRead: (notification: NotificationView) => void;
  /** Where the record lives, when the host portal surfaces one. */
  target: NotificationTarget | null;
  onOpenTarget: (target: NotificationTarget) => void;
};

/**
 * One feed row: what happened, the detail, and how long ago.
 *
 * Unread rows carry a bolder headline, a tinted left rail and a dot; the open
 * row reads as selected. Purely presentational — every piece of state arrives
 * as a prop.
 *
 * The clickable body is a `ButtonBase` *beside* the checkbox and menu rather
 * than a card-wide action area wrapping them. Nesting a checkbox inside a
 * button is invalid HTML and leaves the inner control unreachable by keyboard;
 * three sibling controls give three real tab stops instead.
 */
export function NotificationRow({
  notification,
  active,
  onOpen,
  selected,
  onToggleSelected,
  selectionActive,
  onToggleRead,
  target,
  onOpenTarget,
}: NotificationRowProps) {
  const { unread, domain } = notification;
  // Space is always reserved so nothing reflows on hover; only opacity moves.
  const controlsVisible = selectionActive || selected;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.5,
        p: 0.5,
        borderRadius: 2,
        border: 1,
        borderColor: active ? 'primary.main' : 'divider',
        borderLeftWidth: 3,
        borderLeftColor: unread ? `${domain.accent}.main` : 'transparent',
        bgcolor: active ? 'action.selected' : 'background.paper',
        boxShadow: active ? 2 : 0,
        transition: 'box-shadow 120ms ease, border-color 120ms ease, background-color 120ms ease',
        '&:hover .notification-row-controls, &:focus-within .notification-row-controls': {
          opacity: 1,
        },
      }}
    >
      <Box
        className="notification-row-controls"
        sx={{ opacity: controlsVisible ? 1 : 0, transition: 'opacity 120ms ease', pt: 0.75 }}
      >
        <Checkbox
          size="small"
          checked={selected}
          onChange={() => onToggleSelected(notification.id)}
          inputProps={{ 'aria-label': `Select notification: ${notification.headline}` }}
        />
      </Box>

      <ButtonBase
        onClick={() => onOpen(notification)}
        aria-label={`Open notification: ${notification.headline}`}
        aria-current={active ? 'true' : undefined}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'block',
          textAlign: 'left',
          borderRadius: 1.5,
          p: 1,
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
                {formatRelativeTime(notification.createdAt) || '—'}
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
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: `${domain.accent}.main`,
                  }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </ButtonBase>

      <Box
        className="notification-row-controls"
        sx={{ opacity: controlsVisible ? 1 : 0, transition: 'opacity 120ms ease', pt: 0.75 }}
      >
        <NotificationRowMenu
          unread={unread}
          rowLabel={notification.headline}
          onToggleRead={() => onToggleRead(notification)}
          onOpenTarget={target ? () => onOpenTarget(target) : undefined}
          targetLabel={target?.label}
        />
      </Box>
    </Box>
  );
}
