import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, IconButton, Tooltip, Chip } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import ForumIcon from '@mui/icons-material/Forum';
import StatusChip from '@/components/ui/StatusChip';
import MessageThread from '@/components/messaging/MessageThread';
import MessageComposer from '@/components/messaging/MessageComposer';
import { useMessageThread } from '@/hooks/useMessageThread';
import { formatRelative } from '@/lib/config';
import { conversationTypeMeta } from '../../schema';
import ConversationAvatar from '../molecules/ConversationAvatar';
import type { ConversationView } from '../../hooks/useMessages';

type Props = {
  conversation: ConversationView | null;
  onClose: () => void;
};

/** Shown in the desktop detail column until a conversation is picked. */
function PanePlaceholder() {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ flex: 1, py: 8 }}>
      <ForumIcon sx={{ fontSize: 48, color: 'grey.400' }} />
      <Typography variant="h6">Select a conversation</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', maxWidth: 320 }}
      >
        Pick a thread on the left to read its history and reply.
      </Typography>
    </Stack>
  );
}

/**
 * The detail column: conversation header, scrollable history and the composer.
 * The thread query is keyed off the selected conversation, so switching rows
 * swaps the history without unmounting the pane. Replying is disabled on
 * archived and blocked threads — the RLS insert policy would allow it, but
 * writing into a closed thread is not something the admin means to do.
 */
export default function ConversationPane({ conversation, onClose }: Props) {
  const { messages, currentUserId, isLoading, error } = useMessageThread(conversation?.id ?? '');

  if (!conversation) return <PanePlaceholder />;

  const { label } = conversationTypeMeta(conversation.type);
  const closed = conversation.status !== 'active';

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <ConversationAvatar title={conversation.title} type={conversation.type} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ lineHeight: 1.3 }}>
            {conversation.title}
          </Typography>
          {/* Wraps rather than overflowing: the pane is ~450px just past the
              breakpoint, which is not enough for both chips plus the timestamp. */}
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ mt: 0.25, flexWrap: 'wrap', rowGap: 0.5 }}
          >
            <Chip label={label} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            <StatusChip status={conversation.status} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {conversation.lastMessageAt
                ? `Active ${formatRelative(conversation.lastMessageAt)}`
                : 'No activity yet'}
            </Typography>
          </Stack>
        </Box>
        <Tooltip title="Open full view">
          <IconButton
            component={RouterLink}
            to={`/messages/${conversation.id}`}
            size="small"
            aria-label="Open conversation in full view"
          >
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onClose} aria-label="Close conversation">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', py: 2 }}>
        <MessageThread
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoading}
          error={error}
          scrollKey={conversation.id}
        />
      </Box>

      <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
        {closed ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
            This conversation is {conversation.status} — replies are disabled.
          </Typography>
        ) : (
          <MessageComposer conversationId={conversation.id} />
        )}
      </Box>
    </Stack>
  );
}
