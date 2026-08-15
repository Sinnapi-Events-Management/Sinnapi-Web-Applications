import { useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { IconButton, Tooltip, Button, Alert, Stack, Typography } from '@sinnapi/ui';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ThreadPanel, useConversationChannel } from '@sinnapi/ui/messaging';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { useProfile } from '@/hooks/queries';
import { useThread } from '@/hooks/messaging/useThread';
import { useThreadControls } from '@/hooks/messaging/useThreadControls';
import { useJoinSupportThread } from '@/hooks/messaging/useJoinSupportThread';
import type { AdminConversationView } from '@/hooks/messaging/useConversationViews';

type Props = {
  conversation: AdminConversationView | null;
  onClose: () => void;
};

/** Offered instead of a composer on a thread the operator only observes. */
function ObserverNotice({
  conversation,
  onJoin,
  joining,
}: {
  conversation: AdminConversationView;
  onJoin: () => void;
  joining: boolean;
}) {
  const joinable = conversation.type === 'client_admin' || conversation.type === 'vendor_admin';

  return (
    <Stack spacing={1} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          {joinable
            ? 'You are viewing this support thread but are not part of it yet.'
            : // A private negotiation between two other parties. Read-only is
              // the whole point of moderation access, not a limitation to work
              // around.
              'You are overseeing this conversation. Only the client and vendor can post in it.'}
        </Typography>
      </Stack>
      {joinable && (
        <Button
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<GroupAddIcon />}
          onClick={onJoin}
          disabled={joining}
          sx={{ alignSelf: 'flex-start' }}
        >
          {joining ? 'Joining…' : 'Join and reply'}
        </Button>
      )}
    </Stack>
  );
}

/**
 * The detail column: conversation header, scrollable history, and either a
 * composer or the reason there isn't one.
 *
 * Everything visual now comes from `ThreadPanel` in `@sinnapi/ui/messaging`, so
 * this portal's thread is the same component the client and vendor see. What
 * stays here is what is genuinely admin-only: the observer/participant
 * distinction, and the link out to the full-page view.
 */
export default function ConversationPane({ conversation, onClose }: Props) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const conversationId = conversation?.id ?? '';

  const thread = useThread(conversationId);
  const controls = useThreadControls();
  const joiner = useJoinSupportThread();

  const { counterpartyOnline, typingNames, setTyping } = useConversationChannel({
    client: supabase,
    conversationId: conversationId || null,
    currentUserId: user?.id,
    displayName: profile?.full_name ?? 'Sinnapi support',
    // An operator merely overseeing a thread should not appear as "online" to
    // the two people in it — that reads as Sinnapi having joined the room.
    enabled: !!conversation && !conversation.isObserver,
  });

  const onReachBottom = useCallback(() => {
    // Nothing to stamp: an observer has no participant row.
    if (conversation?.isObserver) return;
    // Keyed on the newest-message timestamp so a reply arriving while the
    // operator is watching re-stamps instead of being suppressed.
    controls.markRead(conversationId, conversation?.lastMessageAt);
  }, [controls, conversationId, conversation?.isObserver, conversation?.lastMessageAt]);

  const onToggleMute = useCallback(
    (muted: boolean) => void controls.setMuted(conversationId, muted),
    [controls, conversationId],
  );

  const onToggleArchive = useCallback(
    (archived: boolean) => void controls.setArchived(conversationId, archived),
    [controls, conversationId],
  );

  const isObserver = !!conversation?.isObserver;

  return (
    <ThreadPanel
      conversation={conversation}
      audience="admin"
      messages={thread.messages}
      currentUserId={thread.currentUserId}
      isLoading={thread.isLoading}
      error={thread.error}
      onSend={thread.send}
      onTypingChange={isObserver ? undefined : setTyping}
      onReachBottom={onReachBottom}
      onOpenAttachment={thread.openAttachment}
      attachments={isObserver ? undefined : thread.attachments}
      onAttachFiles={isObserver ? undefined : thread.attachFiles}
      onRemoveAttachment={isObserver ? undefined : thread.removeAttachment}
      online={isObserver ? undefined : counterpartyOnline}
      typingNames={typingNames}
      onClose={onClose}
      onToggleMute={isObserver ? undefined : onToggleMute}
      onToggleArchive={onToggleArchive}
      headerChildren={
        conversation && (
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
        )
      }
      // Takes the composer's place rather than sitting under a dead one.
      composerSlot={
        conversation && isObserver ? (
          <ObserverNotice
            conversation={conversation}
            onJoin={() => void joiner.join(conversation.id)}
            joining={joiner.isJoining(conversation.id)}
          />
        ) : undefined
      }
      banner={
        joiner.error ? (
          <Alert severity="error" onClose={joiner.clearError}>
            {joiner.error}
          </Alert>
        ) : undefined
      }
      placeholderTitle="Select a conversation"
      placeholderDescription="Pick a thread on the left to read its history and reply."
    />
  );
}
