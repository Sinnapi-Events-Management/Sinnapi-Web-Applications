import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AVATAR_EXTENSION, AVATAR_MAX_MB, toSquareAvatar } from '@/lib/image';

/**
 * Avatars live in the existing public bucket. Its policies already say exactly
 * what this flow needs — anyone may read, but only the owner may write or delete
 * their own objects — and it caps uploads at 10 MB / image mime types, so no new
 * bucket or migration is involved.
 */
const AVATAR_BUCKET = 'public-media';

/**
 * The object key's first segment must be the owner's id: that's the bucket's
 * path convention, and it keeps one user's avatars trivially separable from
 * another's. The timestamp busts the CDN cache — reusing a fixed key would leave
 * the old image showing until the edge cache expired.
 */
function avatarPath(userId: string): string {
  return `${userId}/avatar-${Date.now()}.${AVATAR_EXTENSION}`;
}

/**
 * Recover the storage key from a public URL so the previous avatar can be
 * cleaned up. Returns null for anything not served from this bucket (e.g. an
 * OAuth provider's avatar), which correctly skips the delete.
 */
function pathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${AVATAR_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split('?')[0] || null;
}

/**
 * Owns the profile-picture lifecycle: pick → downscale → upload → point the
 * profile at it, plus removal.
 *
 * The file is squared and re-encoded in the browser (see `lib/image`) before it
 * is uploaded, so a phone photo never travels at full size. A local object URL
 * stands in as the preview while the round trip is in flight, so the new picture
 * appears immediately rather than after the refetch.
 */
export function useAvatarUpload(currentUrl: string | null, onDone?: (message: string) => void) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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

  /** Point the profile row at `url` (or clear it) and refresh the shared cache. */
  const writeAvatarUrl = useCallback(
    async (userId: string, url: string | null): Promise<boolean> => {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', userId);
      if (error) {
        setErr(error.message);
        return false;
      }
      await qc.invalidateQueries({ queryKey: ['profile'] });
      return true;
    },
    [qc],
  );

  const upload = useCallback(
    async (file: File) => {
      setErr(null);

      if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
        setErr(`Pick an image under ${AVATAR_MAX_MB} MB.`);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErr('Pick an image file (JPG, PNG, WebP or AVIF).');
        return;
      }

      setBusy(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Your session has expired. Sign in again to change your photo.');

        const squared = await toSquareAvatar(file);
        setPreviewUrl(URL.createObjectURL(squared));

        const path = avatarPath(user.id);
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, squared, { contentType: squared.type, upsert: true });
        if (uploadError) throw new Error(uploadError.message);

        const {
          data: { publicUrl },
        } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

        if (!(await writeAvatarUrl(user.id, publicUrl))) {
          // The row still points at the old image, so the just-uploaded object
          // is unreachable — drop it rather than leave it orphaned.
          await supabase.storage.from(AVATAR_BUCKET).remove([path]);
          return;
        }

        // Best-effort: a failed cleanup leaves a stray object, which is strictly
        // better than failing a save the user already saw succeed.
        const previousPath = pathFromPublicUrl(currentUrl);
        if (previousPath && previousPath !== path) {
          await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
        }

        setPreviewUrl(null);
        onDone?.('Your profile photo has been updated.');
      } catch (e) {
        setPreviewUrl(null);
        setErr(e instanceof Error ? e.message : 'Upload failed. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [currentUrl, onDone, setPreviewUrl, writeAvatarUrl],
  );

  const remove = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session has expired. Sign in again to change your photo.');

      if (!(await writeAvatarUrl(user.id, null))) return;

      const previousPath = pathFromPublicUrl(currentUrl);
      if (previousPath) await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);

      setPreviewUrl(null);
      onDone?.('Your profile photo has been removed.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not remove the photo. Try again.');
    } finally {
      setBusy(false);
    }
  }, [currentUrl, onDone, setPreviewUrl, writeAvatarUrl]);

  return {
    busy,
    err,
    clearError: useCallback(() => setErr(null), []),
    /** Local preview shown while the upload is in flight, else null. */
    preview,
    upload,
    remove,
    maxSizeMb: AVATAR_MAX_MB,
  };
}
