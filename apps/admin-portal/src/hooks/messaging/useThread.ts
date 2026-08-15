import { useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { MessageAttachmentView, MessageView } from '@sinnapi/ui/messaging';
import { useAttachmentStaging } from '@sinnapi/ui/messaging';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { MESSAGING_KEYS, useMessages } from '@/hooks/queries';
import type { MessageModel } from '@/lib/types';

const BUCKET = 'chat-attachments';

/** Signed URLs are minted on click; this is how long one stays valid. */
const SIGNED_URL_TTL_SECONDS = 60;

function toView(m: MessageModel): MessageView {
  return {
    id: m.id,
    senderId: m.sender_id ?? '',
    body: m.body,
    createdAt: m.created_at,
    editedAt: m.edited_at,
    isSystem: m.is_system,
    moderationStatus: (m.moderation_status ?? 'pending') as MessageView['moderationStatus'],
    attachments: (m.message_attachments ?? []).map((a) => ({
      id: a.id,
      storagePath: a.storage_path,
      fileName: a.file_name ?? 'attachment',
      mimeType: a.mime_type,
      sizeBytes: a.size_bytes,
      scanStatus: a.scan_status as MessageAttachmentView['scanStatus'],
    })),
  };
}

/**
 * One conversation's messages, plus everything needed to add to them.
 *
 * Sending goes through the `send_message` RPC rather than a direct insert. The
 * RPC commits the message and its attachment rows in one transaction, so a
 * bubble never streams to the recipient advertising files that are not yet
 * attached — which is exactly what a two-step insert would produce now that the
 * thread is live.
 *
 * There is no optimistic bubble. The realtime subscription echoes the sender's
 * own INSERT back within a frame or two, so an optimistic row would be replaced
 * almost immediately — and reconciling it against the server row (matching on
 * what? the body?) costs more than it buys. The composer's own busy state
 * covers the gap.
 */
export function useThread(conversationId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, error } = useMessages(conversationId);

  const uploader = useMemo(
    () => ({
      upload: (path: string, file: File) =>
        supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false })
          .then(({ error: e }) => ({ error: e ? { message: e.message } : null })),
      remove: (paths: string[]) => supabase.storage.from(BUCKET).remove(paths),
    }),
    [],
  );

  const staging = useAttachmentStaging({ uploader, conversationId });

  // `toPayload` changes identity as files are staged; a ref keeps `send` stable
  // so the composer does not re-render on every upload tick.
  const payloadRef = useRef(staging.toPayload);
  payloadRef.current = staging.toPayload;

  const messages = useMemo(() => (data ?? []).map(toView), [data]);

  const send = useCallback(
    async (body: string) => {
      const { error: rpcError } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_body: body || null,
        p_attachments: payloadRef.current(),
      });

      if (rpcError) {
        throw new Error(
          rpcError.message.includes('messages_insert') ||
            rpcError.message.includes('row-level security')
            ? 'This conversation is closed to new messages.'
            : 'Your message could not be sent. Please try again.',
        );
      }

      staging.clear();
      // Realtime normally beats this, but a dropped socket must not leave the
      // sender's own message missing from their screen.
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.thread(conversationId) });
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversations });
    },
    [conversationId, qc, staging],
  );

  /**
   * Mints a short-lived signed URL and opens it. The bucket is private, so
   * there is no durable URL to render into the DOM — and minting one per
   * attachment on render would start the expiry clock on files nobody opened.
   */
  const openAttachment = useCallback(async (attachment: MessageAttachmentView) => {
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storagePath, SIGNED_URL_TTL_SECONDS, {
        download: attachment.fileName,
      });

    if (signError || !signed?.signedUrl) throw new Error('Could not open this file.');
    window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return {
    messages,
    currentUserId: user?.id,
    isLoading,
    error,
    send,
    openAttachment,
    attachments: staging.items,
    attachFiles: staging.attach,
    removeAttachment: staging.remove,
  };
}
