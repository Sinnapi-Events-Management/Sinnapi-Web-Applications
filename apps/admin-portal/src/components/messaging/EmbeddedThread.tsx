import { useCallback } from 'react';
import { Box, Stack } from '@sinnapi/ui';
import { MessageThread, ThreadComposer, useConversationChannel } from '@sinnapi/ui/messaging';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { useProfile } from '@/hooks/queries';
import { useThread } from '@/hooks/messaging/useThread';
import { useThreadControls } from '@/hooks/messaging/useThreadControls';
import { useMessagingSync } from '@/hooks/messaging/useMessagingSync';

type Props = {
  /** Already resolved by the caller's find-or-create RPC. */
  conversationId: string;
  counterpartyName: string;
  counterpartyType?: string;
  /** Fills its container when true; otherwise sits at a fixed height. */
  fill?: boolean;
  height?: number;
};

/**
 * A conversation embedded in a page that is not the inbox — the client detail
 * chat and the event page's vendor drawer.
 *
 * Both of those previously hand-rolled their own bubbles, with
 * `bgcolor: mine ? 'primary.main' : 'grey.100'`. That literal is why an
 * incoming message was an near-white block on the portal's warm dark canvas:
 * `grey.100` is a fixed palette value and does not follow the mode. They also
 * had no day dividers, no timestamps, no delivery state, no attachments and no
 * realtime, so a reply from the other side simply never appeared.
 *
 * This is `ThreadPanel` minus the header — these surfaces already carry their
 * own, naming the client or the vendor in the drawer's own chrome.
 */
export default function EmbeddedThread({
  conversationId,
  counterpartyName,
  counterpartyType = 'client_admin',
  fill = false,
  height = 460,
}: Props) {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const thread = useThread(conversationId);
  const controls = useThreadControls();

  // Scoped to this conversation: these surfaces are not the inbox, so the
  // subscription only needs to keep the thread on screen fresh.
  useMessagingSync(conversationId);

  const { typingNames, setTyping } = useConversationChannel({
    client: supabase,
    conversationId,
    currentUserId: user?.id,
    displayName: profile?.full_name ?? 'Sinnapi support',
  });

  // These surfaces have no conversation row to read a timestamp from, so the
  // newest loaded message stands in as the signature — same effect: a reply
  // arriving while the drawer is open re-stamps rather than being suppressed.
  const newestAt = thread.messages[thread.messages.length - 1]?.createdAt ?? null;

  const onReachBottom = useCallback(
    () => controls.markRead(conversationId, newestAt),
    [controls, conversationId, newestAt],
  );

  return (
    <Stack
      sx={{
        height: fill ? '100%' : height,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <MessageThread
          messages={thread.messages}
          currentUserId={thread.currentUserId}
          isLoading={thread.isLoading}
          error={thread.error}
          scrollKey={conversationId}
          audience="admin"
          counterpartyName={counterpartyName}
          counterpartyType={counterpartyType}
          typingNames={typingNames}
          onOpenAttachment={thread.openAttachment}
          onReachBottom={onReachBottom}
          emptyHint="No messages yet — start the conversation 👋"
        />
      </Box>

      <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <ThreadComposer
          onSend={thread.send}
          onTypingChange={setTyping}
          attachments={thread.attachments}
          onAttachFiles={thread.attachFiles}
          onRemoveAttachment={thread.removeAttachment}
        />
      </Box>
    </Stack>
  );
}
