import { useMemo } from 'react';
import type { ConversationView } from '@sinnapi/ui/messaging';
import { titleize } from '@/lib/config';
import { useConversations } from '@/hooks/queries';
import { useAuth } from '@/auth/AuthProvider';
import type { ConversationModel } from '@/lib/types';

/**
 * Flattens `get_my_conversations()` rows into the shape
 * `@sinnapi/ui/messaging` renders.
 *
 * Thin, because the RPC already did the work that used to live here: resolving
 * who the thread is with, and counting what is unread. What is left is naming
 * and the one comparison the server cannot make for the UI — whether the
 * preview is the viewer's own message, which decides between "Deposit received"
 * and "You: Deposit received".
 */
function toView(c: ConversationModel, myId: string | undefined): ConversationView {
  return {
    id: c.id,
    // The subject is the fallback rather than the primary: a support thread's
    // subject is "Sinnapi support", which the RPC already returns as the
    // counterparty, and a vendor thread's subject is the business name repeated.
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
