'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PendingAttachment } from '../molecules/ComposerAttachmentTray';

/**
 * Staging for files the user has picked but not yet sent.
 *
 * Upload happens here, before the send, for two reasons that both come from the
 * schema. `chat_write` (migration 0815d) authorises an object by the
 * conversation id in its path, which the composer already knows — so no message
 * needs to exist first. And uploading during typing means a photo attached at
 * the start of a long message is already in the bucket by the time Enter is
 * pressed, rather than starting a 3MB transfer at the moment the user expects
 * the bubble to appear.
 *
 * PATH: `{conversation_id}/{draft_id}/{filename}`. The draft id is client-side
 * and disposable; if the send never happens the object is orphaned rather than
 * attached to anything, which is why `chat_delete` lets the uploader clean up.
 *
 * The storage client is injected — `@sinnapi/ui` holds no data client.
 */

export type AttachmentUploader = {
  upload: (path: string, file: File) => Promise<{ error: { message: string } | null }>;
  remove: (paths: string[]) => Promise<unknown>;
};

export type UseAttachmentStagingOptions = {
  uploader: AttachmentUploader;
  conversationId: string | null | undefined;
  maxFiles?: number;
  maxBytes?: number;
};

/** Mirrors the bucket's `file_size_limit` after 0815d. */
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_FILES = 10;

function draftId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Strips path separators and exotic characters from a user-supplied filename. */
function safeName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, '_').slice(0, 120) || 'attachment';
}

export function useAttachmentStaging({
  uploader,
  conversationId,
  maxFiles = DEFAULT_MAX_FILES,
  maxBytes = DEFAULT_MAX_BYTES,
}: UseAttachmentStagingOptions) {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  // path per staged id, so `clear` can delete objects that were never sent.
  const paths = useRef<Map<string, string>>(new Map());

  const patch = useCallback((id: string, next: Partial<PendingAttachment>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
  }, []);

  const attach = useCallback(
    (files: File[]) => {
      if (!conversationId) return;

      setItems((prev) => {
        const room = maxFiles - prev.length;
        if (room <= 0) return prev;

        const accepted = files.slice(0, room).map((file) => {
          const id = draftId();
          const tooBig = file.size > maxBytes;
          return {
            id,
            file,
            // Only images get a thumbnail; an object URL for a 10MB PDF buys
            // nothing and has to be revoked all the same.
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
            progress: tooBig ? undefined : 0,
            error: tooBig ? 'Too large (max 10 MB)' : null,
          } satisfies PendingAttachment;
        });

        // Upload after the state update so the tray shows the tile immediately;
        // a file that appears only once it has finished uploading looks broken
        // on a slow connection.
        for (const item of accepted) {
          if (item.error) continue;
          const path = `${conversationId}/${item.id}/${safeName(item.file.name)}`;
          paths.current.set(item.id, path);

          void uploader
            .upload(path, item.file)
            .then(({ error }) => {
              if (error) {
                paths.current.delete(item.id);
                patch(item.id, { error: 'Upload failed', progress: undefined });
              } else {
                patch(item.id, { progress: 100, error: null });
              }
            })
            .catch(() => {
              paths.current.delete(item.id);
              patch(item.id, { error: 'Upload failed', progress: undefined });
            });
        }

        return [...prev, ...accepted];
      });
    },
    [conversationId, maxFiles, maxBytes, uploader, patch],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => {
        const target = prev.find((it) => it.id === id);
        if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
        return prev.filter((it) => it.id !== id);
      });

      const path = paths.current.get(id);
      if (path) {
        paths.current.delete(id);
        // Best effort. A failed cleanup leaves an orphan in a private bucket
        // that nothing references — not worth blocking the user over.
        void uploader.remove([path]).catch(() => undefined);
      }
    },
    [uploader],
  );

  /** Called after a successful send: the objects are now owned by a message. */
  const clear = useCallback(() => {
    setItems((prev) => {
      for (const it of prev) if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      return [];
    });
    paths.current.clear();
  }, []);

  /** The payload `send_message` expects, for the files that uploaded cleanly. */
  const toPayload = useCallback(
    () =>
      items
        .filter((it) => !it.error && paths.current.has(it.id))
        .map((it) => ({
          storage_path: paths.current.get(it.id)!,
          file_name: it.file.name,
          mime_type: it.file.type || null,
          size_bytes: it.file.size,
        })),
    [items],
  );

  // Object URLs outlive the component unless revoked, and a thread the user
  // opens and closes repeatedly would leak one per image previewed.
  useEffect(
    () => () => {
      for (const it of items) if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    },
    // Intentionally on unmount only; `remove` and `clear` revoke as they go.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    items,
    attach,
    remove,
    clear,
    toPayload,
    uploading: items.some((i) => i.progress === 0),
  };
}
