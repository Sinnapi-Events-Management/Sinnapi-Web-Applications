import { validateImageFile } from '@sinnapi/ui/profile';
import { publicMediaStorage, PUBLIC_MEDIA_BUCKET } from './profileImage';

/**
 * Cover images for quote packages.
 *
 * They share the `public-media` bucket with profile pictures — its policies
 * already say what this needs (anyone reads, only the owner writes their own
 * objects) and it caps uploads at 10 MB of image mime types, so no new bucket
 * and no storage migration is involved.
 *
 * What is NOT shared is the preparation. `toSquareImage` in the profile kit
 * centre-crops to a square because that is how an avatar is displayed; a
 * package cover is a 16:7 band across the top of a card, and squaring one would
 * throw away the half of the photograph the vendor chose it for.
 */

/** Width, in px, of the stored cover. 1600 covers 2× a full-width card. */
const COVER_WIDTH = 1600;

/** The band the card renders. Kept here so the crop matches the layout. */
const COVER_ASPECT = 16 / 7;

export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
export const COVER_MAX_MB = 8;

const OUTPUT_TYPE = 'image/webp';
const OUTPUT_QUALITY = 0.86;

export { validateImageFile };

/**
 * Centre-crop `file` to the card's band and downscale it.
 *
 * Normalising in the browser keeps a 6 MB phone photo from ever leaving the
 * device: what is uploaded is always a small, predictably-shaped file, so the
 * card looks the same whichever vendor filled it and a slow connection is not
 * punished for a good camera.
 *
 * Throws when the file is not a decodable image, which the caller surfaces as a
 * field error rather than a silent no-op.
 */
export async function toCoverImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That file couldn't be read as an image.");
  });

  try {
    // Take the widest band the source can give at the target ratio, centred.
    const sourceAspect = bitmap.width / bitmap.height;
    const cropWidth = sourceAspect > COVER_ASPECT ? bitmap.height * COVER_ASPECT : bitmap.width;
    const cropHeight = sourceAspect > COVER_ASPECT ? bitmap.height : bitmap.width / COVER_ASPECT;
    const sx = (bitmap.width - cropWidth) / 2;
    const sy = (bitmap.height - cropHeight) / 2;

    const width = Math.min(COVER_WIDTH, Math.round(cropWidth));
    const height = Math.round(width / COVER_ASPECT);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error("That image couldn't be prepared for upload.");
    context.drawImage(bitmap, sx, sy, cropWidth, cropHeight, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY),
    );
    if (!blob) throw new Error("That image couldn't be prepared for upload.");
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Where a vendor's 16:7 cover objects live, `folder` naming the feature.
 *
 * Keyed by vendor id because the bucket's write policy is owner-scoped, and
 * with a fresh id per upload rather than a stable name: replacing a cover under
 * the same key would be served stale from the CDN for as long as the old object
 * is cached, and a vendor who just changed their photo would swear it did not
 * save.
 */
export function vendorCoverPath(folder: string, vendorId: string): string {
  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${folder}/${vendorId}/${token}.webp`;
}

/** Where a vendor's package covers live. */
export function packageCoverPath(vendorId: string): string {
  return vendorCoverPath('packages', vendorId);
}

export { publicMediaStorage, PUBLIC_MEDIA_BUCKET };
