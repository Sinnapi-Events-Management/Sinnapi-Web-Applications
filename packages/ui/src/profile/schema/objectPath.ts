import { PROFILE_IMAGE_EXTENSION } from './image';

/**
 * Storage key conventions for profile imagery.
 *
 * Both functions encode the same rule from the storage migration: the first path
 * segment of an object is the owning entity's id. Keeping the build and the
 * parse side by side is deliberate — they are inverses, and a change to one that
 * misses the other would silently orphan every previously stored object.
 */

/**
 * Build the object key for a freshly picked image.
 *
 * The owner id must lead, because that is what the bucket's policies are written
 * against. The timestamp busts the CDN cache: reusing a fixed key would leave
 * the old image showing until the edge cache expired.
 */
export function profileImagePath(
  ownerId: string,
  slug: string,
  extension = PROFILE_IMAGE_EXTENSION,
): string {
  return `${ownerId}/${slug}-${Date.now()}.${extension}`;
}

/**
 * Recover the storage key from a public URL so the previous image can be cleaned
 * up. Returns null for anything not served from `bucket` — an OAuth provider's
 * avatar, say — which correctly skips the delete rather than guessing at a key.
 */
export function pathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split('?')[0] || null;
}
