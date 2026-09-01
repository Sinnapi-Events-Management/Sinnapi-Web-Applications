import { supabase } from './supabase';

/**
 * Where portfolio media is stored, and the two calls the upload flow makes.
 *
 * Two buckets rather than one because their constraints are genuinely different
 * and both already exist with the right policies (migration `…0013_storage`):
 * `public-media` is capped at 10 MB and restricted to image mime types, while
 * `vendor-videos` allows 500 MB of mp4/webm/quicktime. Both are public-read with
 * owner-only write, which is exactly what a portfolio needs — a client viewing a
 * vendor page must be able to load the bytes without a signed URL, and nobody
 * but the uploader may replace or delete them.
 *
 * No new migration is involved, and nothing here decides *what* may be uploaded;
 * that is `schema/mediaUpload`, so the rules live next to the copy that explains
 * them to the vendor.
 */
export const PORTFOLIO_IMAGE_BUCKET = 'public-media';
export const PORTFOLIO_VIDEO_BUCKET = 'vendor-videos';

export function portfolioBucket(mediaType: 'image' | 'video'): string {
  return mediaType === 'image' ? PORTFOLIO_IMAGE_BUCKET : PORTFOLIO_VIDEO_BUCKET;
}

/** The signed-in user's id, which every object key must lead with. */
export async function currentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Upload `blob` and return the URL it is served from.
 *
 * `upsert: false` on purpose: keys carry a random segment, so a collision would
 * mean a bug rather than a re-upload, and failing loudly beats silently
 * overwriting another item's bytes.
 */
export async function uploadPortfolioObject(
  bucket: string,
  path: string,
  blob: Blob,
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort delete, by contract: a stray object costs a few kilobytes, while a
 * throw here would fail a removal the vendor has already been told succeeded.
 */
export async function removePortfolioObject(bucket: string, path: string): Promise<void> {
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    /* orphaned object — harmless, and not worth failing the removal over */
  }
}

/**
 * Recover an object key from the public URL we stored, so a removed item's bytes
 * can be cleaned up too. Returns null for anything not served from `bucket` — a
 * pasted third-party link, say — which correctly skips the delete rather than
 * guessing at a key.
 */
export function pathFromPublicUrl(url: string | null, bucket: string): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split('?')[0] || null;
}
