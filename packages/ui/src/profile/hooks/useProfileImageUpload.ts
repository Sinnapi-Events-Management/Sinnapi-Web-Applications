import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PROFILE_IMAGE_MAX_MB,
  pathFromPublicUrl,
  prepareImage,
  profileImagePath,
  validateImageFile,
} from '../schema';
import type { ImageFit } from '../schema';
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
  /**
   * `square` (default) centre-crops, for avatars. `contain` keeps the image's
   * own shape, for logos — a wide wordmark must not lose its ends.
   */
  fit?: ImageFit;
  /**
   * Public URLs another record still points at. The outgoing image is never
   * deleted when it is one of these — e.g. a logo adopted from the onboarding
   * photo must not take that photo with it when it is later replaced.
   */
  keepUrls?: ReadonlyArray<string | null | undefined>;
};

/** What the session-expired case says, in both directions. */
const SESSION_EXPIRED = 'Your session has expired. Sign in again to change your photo.';

/**
 * What a storage refusal says instead of what Postgres says.
 *
 * A bucket policy that declines the write surfaces as the raw string `new row
 * violates row-level security policy for table "objects"`, which reads as a
 * broken site and tells the person nothing they can act on. Everything else is
 * passed through untouched — the size and type rejections are already written
 * for the person who picked the file.
 */
const UPLOAD_REFUSED =
  'We could not save that image — this account is not allowed to upload right now. Try again, and contact support if it keeps happening.';

const REFUSAL =
  /row-level security|violates row-level|not authoriz|unauthorized|permission denied|\b403\b/i;

function readableError(e: unknown, fallback: string): string {
  if (!(e instanceof Error) || !e.message) return fallback;
  return REFUSAL.test(e.message) ? UPLOAD_REFUSED : e.message;
}

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
  fit = 'square',
  keepUrls,
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

  // The object behind `currentUrl`, unless another record still shares it.
  const keepKey = (keepUrls ?? []).filter(Boolean).join('|');
  const outgoingPath = useCallback((): string | null => {
    if (!currentUrl || keepKey.split('|').includes(currentUrl)) return null;
    return pathFromPublicUrl(currentUrl, bucket);
  }, [bucket, currentUrl, keepKey]);

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
        const prepared = await prepareImage(file, fit);
        setPreviewUrl(URL.createObjectURL(prepared));

        const path = profileImagePath(ownerId, slug);
        await storage.upload(path, prepared);
        uploadedPath = path;

        await commit(storage.publicUrl(path));

        // Best-effort: a failed cleanup leaves a stray object, which is strictly
        // better than failing a save the user has already seen succeed.
        const previousPath = outgoingPath();
        if (previousPath && previousPath !== path) await storage.remove([previousPath]);

        setPreviewUrl(null);
        onDone?.(messages.updated);
      } catch (e) {
        // The record still points at the old image, so anything just uploaded is
        // unreachable — drop it rather than leave it orphaned.
        if (uploadedPath) await storage.remove([uploadedPath]);
        setPreviewUrl(null);
        setError(readableError(e, 'Upload failed. Try again.'));
      } finally {
        setBusy(false);
      }
    },
    [
      commit,
      fit,
      maxSizeMb,
      messages.updated,
      onDone,
      outgoingPath,
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

      const previousPath = outgoingPath();
      if (previousPath) await storage.remove([previousPath]);

      setPreviewUrl(null);
      onDone?.(messages.removed);
    } catch (e) {
      setError(readableError(e, 'Could not remove the photo. Try again.'));
    } finally {
      setBusy(false);
    }
  }, [commit, messages.removed, onDone, outgoingPath, ownerId, setPreviewUrl, storage]);

  /**
   * Re-upload an image that already lives at a public URL — e.g. "use my
   * onboarding photo as my logo". Copied rather than pointed at, so each
   * record owns its own object and replacing one never deletes the other.
   */
  const adoptFromUrl = useCallback(
    async (url: string) => {
      setError(null);
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error('We could not load that image. Upload a file instead.');
        const blob = await res.blob();
        await upload(
          new File([blob], `${slug}.${blob.type.split('/')[1] ?? 'png'}`, { type: blob.type }),
        );
      } catch (e) {
        setError(readableError(e, 'We could not load that image. Upload a file instead.'));
      }
    },
    [slug, upload],
  );

  return {
    busy,
    error,
    clearError: useCallback(() => setError(null), []),
    /** Local preview shown while the upload is in flight, else null. */
    preview,
    /** What the card should render: the in-flight preview, else the stored image. */
    displayUrl: preview ?? currentUrl,
    upload,
    adoptFromUrl,
    remove,
    maxSizeMb,
  };
}
