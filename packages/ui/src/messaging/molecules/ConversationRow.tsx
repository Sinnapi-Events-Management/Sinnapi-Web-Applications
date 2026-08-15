'use client';
import { Box, Stack, Typography, Chip, CardActionArea, Tooltip, Skeleton } from '@mui/material';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { conversationTypeMeta, type MessagingAudience } from '../conversationType';
import { formatRelativeTime } from '../format';
import { UnreadBadge } from '../atoms/UnreadBadge';
import { TypingDots } from '../atoms/TypingDots';
import { ConversationAvatar } from './ConversationAvatar';
import type { ConversationView } from '../types';

export type ConversationRowProps = {
  conversation: ConversationView;
  audience: MessagingAudience;
  /** The row currently open in the thread pane. */
  active: boolean;
  onOpen: (id: string) => void;
  /** Someone else is typing in this thread right now. */
  typing?: boolean;
  /** Hides the type chip in inboxes that only ever hold one type. */
  showTypeChip?: boolean;
};

/**
 * One inbox row: who the thread is with, the last thing said, how long ago, and
 * how much of it you have not read.
 *
 * The preview is replaced by a live typing indicator when the counterparty is
 * mid-sentence. That is the one moment the stale last-message snippet is
 * actively misleading — something newer is arriving and the row is still
 * showing what came before it.
 *
 * Unread state is carried three ways at once (weight, the leading rule, the
 * count) because each fails somewhere the others do not: weight is invisible at
 * a glance across a long list, the coloured rule alone excludes anyone who
 * cannot see it, and the count is the only one that says *how much*.
 */
export function ConversationRow({
  conversation,
  audience,
  active,
  onOpen,
  typing = false,
  showTypeChip = true,
}: ConversationRowProps) {
  const { label, color } = conversationTypeMeta(conversation.type, audience);
  const unread = conversation.unreadCount > 0;
  const closed = conversation.status !== 'active';

  return (
    <CardActionArea
      onClick={() => onOpen(conversation.id)}
      aria-label={`Open conversation with ${conversation.title}${
        unread ? `, ${conversation.unreadCount} unread` : ''
      }`}
      aria-current={active ? 'true' : undefined}
      sx={{
        display: 'block',
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: active ? 'primary.main' : 'divider',
        borderLeftWidth: 3,
        borderLeftColor: unread ? 'primary.main' : 'transparent',
        bgcolor: active ? 'action.selected' : 'background.paper',
        boxShadow: active ? 2 : 0,
        opacity: closed ? 0.75 : 1,
        transition: 'box-shadow 120ms ease, border-color 120ms ease, background-color 120ms ease',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <ConversationAvatar
          title={conversation.title}
          type={conversation.type}
          audience={audience}
          avatarUrl={conversation.avatarUrl}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ flex: 1, minWidth: 0, fontWeight: unread ? 700 : 500 }}
            >
              {conversation.title}
            </Typography>
            {conversation.muted && (
              <Tooltip title="Muted">
                <NotificationsOffIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
              </Tooltip>
            )}
            <Typography
              variant="caption"
              color={unread ? 'primary.main' : 'text.secondary'}
              sx={{ whiteSpace: 'nowrap', fontWeight: unread ? 600 : 400 }}
            >
              {formatRelativeTime(conversation.lastMessageAt)}
            </Typography>
          </Stack>

          <Box sx={{ mt: 0.25, minHeight: 20 }}>
            {typing ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <TypingDots size={5} />
                <Typography variant="body2" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
                  typing…
                </Typography>
              </Stack>
            ) : (
              <Typography
                variant="body2"
                color={conversation.preview ? 'text.secondary' : 'text.disabled'}
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  fontStyle: conversation.preview ? 'normal' : 'italic',
                  fontWeight: unread ? 500 : 400,
                }}
              >
                {conversation.preview ? (
                  <>
                    {/* Naming your own last message is what stops an unanswered
                        thread from looking like it is waiting on you. */}
                    {conversation.previewIsMine && (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        You:{' '}
                      </Box>
                    )}
                    {conversation.preview}
                  </>
                ) : (
                  'No messages yet'
                )}
              </Typography>
            )}
          </Box>

          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
            {showTypeChip && (
              <Chip
                size="small"
                label={label}
                color={color === 'default' ? 'default' : color}
                variant={color === 'default' ? 'outlined' : 'filled'}
                sx={{ height: 20, fontSize: 11 }}
              />
            )}
            {closed && (
              <Chip
                size="small"
                label={conversation.status}
                variant="outlined"
                sx={{ height: 20, fontSize: 11, textTransform: 'capitalize' }}
              />
            )}
            {conversation.subject && conversation.subject !== conversation.title && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                {conversation.subject}
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            <UnreadBadge count={conversation.unreadCount} muted={conversation.muted} />
          </Stack>
        </Box>
      </Stack>
    </CardActionArea>
  );
}

/** Placeholder matching the row's real geometry, so the list does not reflow. */
export function ConversationRowSkeleton() {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Skeleton variant="circular" width={44} height={44} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="55%" height={20} />
          <Skeleton variant="text" width="85%" height={18} />
          <Skeleton variant="rounded" width={72} height={20} sx={{ mt: 0.75 }} />
        </Box>
      </Stack>
    </Box>
  );
}

/** Icon marking a preview whose newest message carried a file but no text. */
export function AttachmentPreviewIcon() {
  return <AttachFileIcon sx={{ fontSize: 13, verticalAlign: 'text-bottom', mr: 0.25 }} />;
}
