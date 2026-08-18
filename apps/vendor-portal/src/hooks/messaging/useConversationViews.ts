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
 * Identical in structure to the client portal's version and deliberately not
 * shared with it: the two portals have separate `ConversationModel` types and
 * separate Supabase clients, and hoisting this into `@sinnapi/ui` would drag a
 * data layer into a package that has none. What *is* shared is everything below
 * it — the view type, the row, the thread, the layout.
 */
function toView(c: ConversationModel, myId: string | undefined): ConversationView {
  return {
    id: c.id,
    // For a vendor the counterparty is the client, or "Sinnapi support" on a
    // `vendor_admin` thread. Both are resolved server-side; nothing here can
    // read a client's name.
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
