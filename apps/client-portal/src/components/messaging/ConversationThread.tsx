import { useCallback } from 'react';
import { ThreadPanel, useConversationChannel, type ConversationView } from '@sinnapi/ui/messaging';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { useProfile } from '@/hooks/queries';
import { useThread } from '@/hooks/messaging/useThread';
import { useThreadControls } from '@/hooks/messaging/useThreadControls';

type Props = {
  conversation: ConversationView | null;
  onClose?: () => void;
};

/**
 * Container for one conversation in the client portal.
 *
 * The split is the point: `ThreadPanel` in `@sinnapi/ui` owns the layout and
 * every pixel, `useThread` owns the messages and the send, `useThreadControls`
 * owns mute/archive/read, and `useConversationChannel` owns presence and
 * typing. This file only wires them together, which is why all three portals
 * can render an identical thread without sharing a data layer.
 */
export default function ConversationThread({ conversation, onClose }: Props) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const conversationId = conversation?.id ?? '';

  const thread = useThread(conversationId);
  const controls = useThreadControls();

  const { counterpartyOnline, typingNames, setTyping } = useConversationChannel({
    client: supabase,
    conversationId: conversationId || null,
    currentUserId: user?.id,
    displayName: profile?.full_name ?? 'Someone',
  });

  // The newest-message timestamp is the dedupe key, so a message arriving while
  // this thread is open and scrolled to the bottom re-stamps rather than being
  // suppressed by the earlier read.
  const onReachBottom = useCallback(
    () => controls.markRead(conversationId, conversation?.lastMessageAt),
    [controls, conversationId, conversation?.lastMessageAt],
  );

  const onToggleMute = useCallback(
    (muted: boolean) => void controls.setMuted(conversationId, muted),
    [controls, conversationId],
  );

  const onToggleArchive = useCallback(
    (archived: boolean) => void controls.setArchived(conversationId, archived),
    [controls, conversationId],
  );

  return (
    <ThreadPanel
      conversation={conversation}
      // Labels a `client_admin` thread "Sinnapi support" rather than "Client
      // support" — the same row reads differently to the two sides of it.
      audience="client"
      messages={thread.messages}
      currentUserId={thread.currentUserId}
      isLoading={thread.isLoading}
      error={thread.error}
      onSend={thread.send}
      onTypingChange={setTyping}
      onReachBottom={onReachBottom}
      onOpenAttachment={thread.openAttachment}
      attachments={thread.attachments}
      onAttachFiles={thread.attachFiles}
      onRemoveAttachment={thread.removeAttachment}
      online={counterpartyOnline}
      typingNames={typingNames}
      onClose={onClose}
      onToggleMute={onToggleMute}
      onToggleArchive={onToggleArchive}
      placeholderTitle="Select a conversation"
      placeholderDescription="Pick a thread on the left to read it and reply, or start a new one."
      emptyHint="No messages yet — introduce yourself 👋"
    />
  );
}
