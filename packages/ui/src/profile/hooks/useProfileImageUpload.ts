import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PROFILE_IMAGE_MAX_MB,
  pathFromPublicUrl,
  profileImagePath,
  toSquareImage,
  validateImageFile,
} from '../schema';
import type { ObjectStoragePort, ProfileImageMessages, ProfileImageTarget } from '../types';

export type UseProfileImageUploadOptions = {
  target: ProfileImageTarget;
  storage: ObjectStoragePort;
  /**
   * Point the record at `url`, or clear it when null. Rejects with a readable
   * message. The portal owns this because it is the only side that knows which
   * table, which column and which query keys to invalidate.
   */
  commit: (url: string | null) => Promise<void>;
  /** Fired with the matching message once a change has landed. */
  onDone?: (message: string) => void;
  messages: ProfileImageMessages;
  /** Largest file the picker accepts, before downscaling. */
  maxSizeMb?: number;
};

/** What the session-expired case says, in both directions. */
const SESSION_EXPIRED = 'Your session has expired. Sign in again to change your photo.';

/**
 * Owns the profile-image lifecycle: pick → validate → downscale → upload →
 * point the record at it → clean up what it replaced. Plus removal.
 *
 * The file is squared and re-encoded in the browser (see `schema/image`) before
 * it is uploaded, so a phone photo never travels at full size. A local object URL
 * stands in as the preview while the round trip is in flight, so the new picture
 * appears immediately rather than after the refetch.
 *
 * The ordering matters and is the reason this is shared rather than copied:
 * the object is uploaded *before* the record is committed, so a failed commit
 * leaves an unreachable object which is then deleted; and the outgoing object is
 * only deleted *after* the commit succeeds, so a failed swap never destroys the
 * image the record still points at.
 */
export function useProfileImageUpload({
  target,
  storage,
  commit,
  onDone,
  messages,
  maxSizeMb = PROFILE_IMAGE_MAX_MB,
}: UseProfileImageUploadOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  // Object URLs are a document-lifetime allocation; release the outgoing one on
  // every swap and on unmount so a session of re-picking doesn't leak blobs.
  const setPreviewUrl = useCallback((next: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setPreview(next);
  }, []);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const { bucket, ownerId, slug, currentUrl } = target;

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      const rejection = validateImageFile(file, maxSizeMb);
      if (rejection) {
        setError(rejection);
        return;
      }
      if (!ownerId) {
        setError(SESSION_EXPIRED);
        return;
      }

      setBusy(true);
      let uploadedPath: string | null = null;
      try {
        const squared = await toSquareImage(file);
        setPreviewUrl(URL.createObjectURL(squared));

        const path = profileImagePath(ownerId, slug);
        await storage.upload(path, squared);
        uploadedPath = path;

        await commit(storage.publicUrl(path));

        // Best-effort: a failed cleanup leaves a stray object, which is strictly
        // better than failing a save the user has already seen succeed.
        const previousPath = pathFromPublicUrl(currentUrl, bucket);
        if (previousPath && previousPath !== path) await storage.remove([previousPath]);

        setPreviewUrl(null);
        onDone?.(messages.updated);
      } catch (e) {
        // The record still points at the old image, so anything just uploaded is
        // unreachable — drop it rather than leave it orphaned.
        if (uploadedPath) await storage.remove([uploadedPath]);
        setPreviewUrl(null);
        setError(e instanceof Error ? e.message : 'Upload failed. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [
      bucket,
      commit,
      currentUrl,
      maxSizeMb,
      messages.updated,
      onDone,
      ownerId,
      setPreviewUrl,
      slug,
      storage,
    ],
  );

  const remove = useCallback(async () => {
    setError(null);
    if (!ownerId) {
      setError(SESSION_EXPIRED);
      return;
    }

    setBusy(true);
    try {
      await commit(null);

      const previousPath = pathFromPublicUrl(currentUrl, bucket);
      if (previousPath) await storage.remove([previousPath]);

      setPreviewUrl(null);
      onDone?.(messages.removed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the photo. Try again.');
    } finally {
      setBusy(false);
    }
  }, [bucket, commit, currentUrl, messages.removed, onDone, ownerId, setPreviewUrl, storage]);

  return {
    busy,
    error,
    clearError: useCallback(() => setError(null), []),
    /** Local preview shown while the upload is in flight, else null. */
    preview,
    /** What the card should render: the in-flight preview, else the stored image. */
    displayUrl: preview ?? currentUrl,
    upload,
    remove,
    maxSizeMb,
  };
}
