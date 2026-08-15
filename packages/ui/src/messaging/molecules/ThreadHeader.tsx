'use client';
import {
  Box,
  Stack,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { conversationTypeMeta, type MessagingAudience } from '../conversationType';
import { formatRelativeTime } from '../format';
import { TypingDots } from '../atoms/TypingDots';
import { ConversationAvatar } from './ConversationAvatar';
import type { ConversationView } from '../types';

export type ThreadHeaderAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

export type ThreadHeaderProps = {
  conversation: ConversationView;
  audience: MessagingAudience;
  /** Presence of the counterparty; `undefined` when not tracked. */
  online?: boolean;
  /** Names of people currently typing, already resolved by the caller. */
  typingNames?: string[];
  onClose?: () => void;
  onToggleMute?: (muted: boolean) => void;
  onToggleArchive?: (archived: boolean) => void;
  /** Portal-specific entries appended to the overflow menu. */
  extraActions?: ThreadHeaderAction[];
  /** Rendered between the title block and the overflow menu. */
  children?: React.ReactNode;
};

/**
 * The thread's title bar: who you are talking to, whether they are here, and
 * the controls that act on the whole conversation.
 *
 * The status line is a single slot that swaps between presence, typing and last
 * activity rather than stacking them. They answer the same question at
 * different freshnesses — "typing" supersedes "online", which supersedes "last
 * active" — and showing two at once produces the contradiction of a header that
 * says both "typing…" and "active 3 days ago".
 *
 * Mute and archive live behind an overflow menu because they are rare and
 * destructive-adjacent; close is a first-class control because on mobile it is
 * the way out of the thread.
 */
export function ThreadHeader({
  conversation,
  audience,
  online,
  typingNames = [],
  onClose,
  onToggleMute,
  onToggleArchive,
  extraActions = [],
  children,
}: ThreadHeaderProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { label } = conversationTypeMeta(conversation.type, audience);
  const archived = conversation.status === 'archived';
  const hasMenu = !!onToggleMute || !!onToggleArchive || extraActions.length > 0;

  const typingLabel =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
        ? `${typingNames[0]} is typing`
        : `${typingNames.length} people are typing`;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{ pb: 1.5, borderBottom: 1, borderColor: 'divider' }}
    >
      <ConversationAvatar
        title={conversation.title}
        type={conversation.type}
        audience={audience}
        avatarUrl={conversation.avatarUrl}
        online={online}
        size={40}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" noWrap sx={{ lineHeight: 1.3 }}>
          {conversation.title}
        </Typography>

        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ mt: 0.25, flexWrap: 'wrap', rowGap: 0.5 }}
        >
          <Chip label={label} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />

          {typingLabel ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <TypingDots size={5} />
              <Typography variant="caption" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
                {typingLabel}
              </Typography>
            </Stack>
          ) : online ? (
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
              Online
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary" noWrap>
              {conversation.lastMessageAt
                ? `Active ${formatRelativeTime(conversation.lastMessageAt)}`
                : 'No activity yet'}
            </Typography>
          )}

          {conversation.muted && (
            <Tooltip title="You muted this conversation">
              <NotificationsOffIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            </Tooltip>
          )}
        </Stack>
      </Box>

      {children}

      {hasMenu && (
        <>
          <IconButton
            size="small"
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-label="Conversation options"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            {onToggleMute && (
              <MenuItem
                onClick={() => {
                  onToggleMute(!conversation.muted);
                  setAnchor(null);
                }}
              >
                <ListItemIcon>
                  {conversation.muted ? (
                    <NotificationsActiveIcon fontSize="small" />
                  ) : (
                    <NotificationsOffIcon fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText>{conversation.muted ? 'Unmute' : 'Mute notifications'}</ListItemText>
              </MenuItem>
            )}
            {onToggleArchive && (
              <MenuItem
                onClick={() => {
                  onToggleArchive(!archived);
                  setAnchor(null);
                }}
              >
                <ListItemIcon>
                  {archived ? (
                    <UnarchiveIcon fontSize="small" />
                  ) : (
                    <Inventory2Icon fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText>{archived ? 'Move to active' : 'Archive'}</ListItemText>
              </MenuItem>
            )}
            {extraActions.map((a) => (
              <MenuItem
                key={a.key}
                onClick={() => {
                  a.onClick();
                  setAnchor(null);
                }}
              >
                <ListItemIcon>{a.icon}</ListItemIcon>
                <ListItemText>{a.label}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </>
      )}

      {onClose && (
        <IconButton size="small" onClick={onClose} aria-label="Close conversation">
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}
