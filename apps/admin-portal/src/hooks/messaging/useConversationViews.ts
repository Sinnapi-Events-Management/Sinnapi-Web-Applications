import { useMemo } from 'react';
import type { ConversationView } from '@sinnapi/ui/messaging';
import { titleize } from '@/lib/config';
import { useConversations } from '@/hooks/queries';
import { useAuth } from '@/auth/AuthProvider';
import type { ConversationModel } from '@/lib/types';

/**
 * The operator's view of a conversation.
 *
 * `isObserver` is the field that only matters here: an admin holding
 * `moderation.manage` sees every thread on the platform, but is a participant
 * in almost none of them. That distinction drives two things — the thread pane
 * offers to enrol them before it offers a composer, and the row never shows an
 * unread count, because a conversation the operator is merely overseeing is not
 * a message awaiting their reply. Letting those nag would make the badge
 * meaningless within a day.
 */
export type AdminConversationView = ConversationView & {
  isObserver: boolean;
  counterpartyId: string | null;
};

function toView(c: ConversationModel, myId: string | undefined): AdminConversationView {
  return {
    id: c.id,
    title: c.counterparty_name ?? c.subject ?? titleize(c.type),
    subject: c.subject,
    type: c.type,
    status: c.status,
    lastMessageAt: c.last_message_at,
    createdAt: c.created_at,
    preview: c.last_message_preview,
    previewIsMine: !!myId && c.last_message_sender_id === myId,
    unreadCount: c.unread_count ?? 0,
    muted: c.is_muted,
    avatarUrl: c.counterparty_avatar_url,
    isObserver: c.is_observer,
    counterpartyId: c.counterparty_id,
  };
}

export function useConversationViews({ enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { data, isLoading, error } = useConversations({ enabled });

  const conversations = useMemo(
    () => (data ?? []).map((c) => toView(c, user?.id)),
    [data, user?.id],
  );

  return { conversations, isLoading, error };
}
