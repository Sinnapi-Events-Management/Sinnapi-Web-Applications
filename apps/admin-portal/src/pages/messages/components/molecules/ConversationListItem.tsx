import { Box, Stack, Typography, Chip, CardActionArea, Tooltip } from '@sinnapi/ui';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { formatRelative } from '@/lib/config';
import { conversationTypeMeta } from '../../schema';
import type { ConversationView } from '../../hooks/useMessages';
import ConversationAvatar from './ConversationAvatar';

type Props = {
  conversation: ConversationView;
  /** The row currently open in the thread pane. */
  active: boolean;
  onOpen: (id: string) => void;
};

/**
 * One inbox row: who the thread is with, the last thing said, and how long ago.
 * Unread rows get a bolder title and a dot; the open row reads as selected.
 * Purely presentational — all state comes from the page's hooks.
 */
export default function ConversationListItem({ conversation, active, onOpen }: Props) {
  const { label, color } = conversationTypeMeta(conversation.type);
  const { unread } = conversation;

  return (
    <CardActionArea
      onClick={() => onOpen(conversation.id)}
      aria-label={`Open conversation with ${conversation.title}`}
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
        transition: 'box-shadow 120ms ease, border-color 120ms ease, background-color 120ms ease',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <ConversationAvatar title={conversation.title} type={conversation.type} />

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
              {formatRelative(conversation.lastMessageAt)}
            </Typography>
          </Stack>

          <Typography
            variant="body2"
            color={conversation.preview ? 'text.secondary' : 'text.disabled'}
            sx={{
              mt: 0.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              fontStyle: conversation.preview ? 'normal' : 'italic',
              fontWeight: unread ? 500 : 400,
            }}
          >
            {conversation.preview ?? 'No messages yet'}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
            <Chip
              size="small"
              label={label}
              color={color === 'default' ? 'default' : color}
              variant={color === 'default' ? 'outlined' : 'filled'}
              sx={{ height: 20, fontSize: 11 }}
            />
            {conversation.subject && conversation.subject !== conversation.title && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                {conversation.subject}
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            {unread && (
              <Box
                aria-label="Unread"
                sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </CardActionArea>
  );
}
