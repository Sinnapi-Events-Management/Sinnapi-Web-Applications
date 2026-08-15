'use client';
import { useState, type MouseEvent } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DoneIcon from '@mui/icons-material/Done';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import LaunchIcon from '@mui/icons-material/Launch';

export type NotificationRowMenuProps = {
  unread: boolean;
  /** Flip the row's read state. */
  onToggleRead: () => void;
  /** Navigate to the record this notification concerns. Omit when there is none. */
  onOpenTarget?: () => void;
  targetLabel?: string;
  /** Names the row for screen readers, e.g. "Booking confirmed". */
  rowLabel: string;
  disabled?: boolean;
};

/**
 * Per-row overflow menu: the actions a reader wants without opening the row.
 *
 * "Mark as unread" is the one that earns its place — re-flagging something to
 * deal with later is how people actually triage, and without it opening a
 * notification is a one-way door. Deleting is deliberately absent: the table
 * has no delete policy, so an option here could only ever fail.
 *
 * Every click stops propagation. The menu sits inside a row whose body is
 * itself a button, and without that a menu selection would also open the row.
 */
export function NotificationRowMenu({
  unread,
  onToggleRead,
  onOpenTarget,
  targetLabel,
  rowLabel,
  disabled,
}: NotificationRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const open = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchor(e.currentTarget);
  };

  const run = (action?: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    setAnchor(null);
    action?.();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={open}
        disabled={disabled}
        aria-label={`More actions for ${rowLabel}`}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={run()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={run(onToggleRead)}>
          <ListItemIcon>
            {unread ? <DoneIcon fontSize="small" /> : <MarkEmailUnreadIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{unread ? 'Mark as read' : 'Mark as unread'}</ListItemText>
        </MenuItem>

        {onOpenTarget && (
          <MenuItem onClick={run(onOpenTarget)}>
            <ListItemIcon>
              <LaunchIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{targetLabel ?? 'Open'}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
