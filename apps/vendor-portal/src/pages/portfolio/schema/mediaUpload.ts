/**
 * What a vendor may upload, and the browser-side preparation that makes it fit.
 *
 * The two buckets have hard constraints the vendor never sees (10 MB and four
 * image mimes; 500 MB and three video mimes), and a phone camera satisfies
 * neither by default — a modern iPhone hands over an 8 MB HEIC, which is both too
 * big and a mime the bucket rejects outright. So images are decoded and
 * re-encoded here before they ever leave the device: whatever the browser can
 * read goes up as a WebP inside the allow-list, and a 12 MB shot becomes a few
 * hundred kilobytes without the vendor being told to go and resize it.
 *
 * Videos cannot be transcoded in a browser, so they are validated rather than
 * converted, and the message says exactly which formats work.
 */

/** Input types the picker offers. Wider than the bucket's, because of the re-encode. */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif';
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';

/** Largest file accepted *before* re-encoding. Generous — the output is small. */
export const IMAGE_MAX_MB = 25;
/** The `vendor-videos` bucket's own ceiling. */
export const VIDEO_MAX_MB = 500;

/**
 * Longest edge of a stored image. 2000px is sharp on a 2× desktop gallery and
 * still well under the bucket's size cap once encoded.
 */
const MAX_EDGE = 2000;
const OUTPUT_TYPE = 'image/webp';
const OUTPUT_EXTENSION = 'webp';
/** Higher than an avatar's: this is the vendor's work, viewed full-screen. */
const OUTPUT_QUALITY = 0.85;

export const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/**
 * Why a picked file was rejected, in words the person who picked it will
 * understand. Checked before any decoding so an obviously-too-large file fails
 * instantly rather than after a multi-megabyte read. Returns null when accepted.
 */
export function validateMediaFile(file: File, mediaType: 'image' | 'video'): string | null {
  if (mediaType === 'image') {
    if (!file.type.startsWith('image/'))
      return 'Pick an image file (JPG, PNG, WebP, AVIF or HEIC).';
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) return `Images must be under ${IMAGE_MAX_MB} MB.`;
    return null;
  }
  if (!VIDEO_EXTENSIONS[file.type]) return 'Videos must be MP4, WebM or MOV.';
  if (file.size > VIDEO_MAX_MB * 1024 * 1024) return `Videos must be under ${VIDEO_MAX_MB} MB.`;
  return null;
}

/**
 * Downscale to `MAX_EDGE` on its longest side and re-encode as WebP.
 *
 * Aspect ratio is preserved rather than centre-cropped — the opposite of the
 * profile kit's `toSquareImage`, and deliberately so: cropping a photographer's
 * composition to a square is destroying the thing being showcased. A file already
 * inside the limit is still re-encoded, because format (not just size) is what
 * the bucket enforces.
 *
 * Throws a readable message when the browser can't decode the file, which the
 * caller shows against that file rather than failing the whole batch.
 */
export async function toPortfolioImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That file couldn't be read as an image.");
  });

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("That image couldn't be prepared for upload.");
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY),
    );
    if (!blob) throw new Error("That image couldn't be prepared for upload.");
    return blob;
  } finally {
    // Frees the decoded bitmap immediately rather than at the next GC — a batch
    // of 20 full-resolution photos is a lot of memory to leave lying around.
    bitmap.close();
  }
}

/** The bytes and file extension to store for one picked file. */
export async function preparePortfolioFile(
  file: File,
  mediaType: 'image' | 'video',
): Promise<{ blob: Blob; extension: string }> {
  if (mediaType === 'video') return { blob: file, extension: VIDEO_EXTENSIONS[file.type] ?? 'mp4' };
  return { blob: await toPortfolioImage(file), extension: OUTPUT_EXTENSION };
}

/**
 * The object key for one upload.
 *
 * The owner id leads because that is what the bucket policies are written
 * against; the vendor id and a random segment keep two uploads in the same second
 * — a multi-file drop is exactly that — from colliding.
 */
export function portfolioObjectPath(ownerId: string, vendorId: string, extension: string): string {
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${ownerId}/portfolio/${vendorId}/${unique}.${extension}`;
}
