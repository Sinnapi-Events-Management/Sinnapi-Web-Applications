import { useQueryClient } from '@tanstack/react-query';
import { MessageComposer as MessageComposerUI } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

/**
 * Container for the shared composer: the input, busy state and error surface
 * live in @sinnapi/ui, while this owns persistence. The row is inserted directly
 * under RLS (policy: sender_id = auth.uid() AND participant).
 */
export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const qc = useQueryClient();

  async function send(body: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Session expired — please sign in again.');

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
      moderation_status: 'pending',
    });
    if (error) throw new Error(error.message);

    qc.invalidateQueries({ queryKey: ['messages', conversationId] });
  }

  return <MessageComposerUI onSend={send} />;
}
