'use client';
import { Paper, Stack, Typography, Button, Checkbox, IconButton, Tooltip } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import CloseIcon from '@mui/icons-material/Close';
import type { NotificationSelection } from '../hooks/useNotificationFeed';

export type NotificationSelectionBarProps = {
  selection: NotificationSelection;
  onMarkRead: (ids: string[]) => void;
  onMarkUnread: (ids: string[]) => void;
  busy?: boolean;
};

/**
 * Bulk-action bar, shown only once something is selected.
 *
 * It sticks below the day headers rather than floating over the list, so it
 * never covers the rows whose selection it is describing. Mounting it on demand
 * is deliberate: a permanently visible action bar reads as chrome and gets
 * tuned out, whereas one that appears on selection is unmistakably about the
 * rows just picked.
 */
export function NotificationSelectionBar({
  selection,
  onMarkRead,
  onMarkUnread,
  busy,
}: NotificationSelectionBarProps) {
  if (!selection.active) return null;

  return (
    <Paper
      variant="outlined"
      role="toolbar"
      aria-label="Actions for selected notifications"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 3,
        px: 1,
        py: 0.5,
        borderRadius: 2,
        bgcolor: 'action.selected',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
        <Checkbox
          size="small"
          checked={selection.allSelected}
          indeterminate={!selection.allSelected}
          onChange={selection.toggleAll}
          inputProps={{ 'aria-label': 'Select all visible notifications' }}
        />
        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          {selection.count} selected
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ flex: 1, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            disabled={busy}
            onClick={() => onMarkRead(selection.ids)}
          >
            Mark read
          </Button>
          <Button
            size="small"
            startIcon={<MarkEmailUnreadIcon />}
            disabled={busy}
            onClick={() => onMarkUnread(selection.ids)}
          >
            Mark unread
          </Button>
          <Tooltip title="Clear selection">
            <IconButton size="small" onClick={selection.clear} aria-label="Clear selection">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
