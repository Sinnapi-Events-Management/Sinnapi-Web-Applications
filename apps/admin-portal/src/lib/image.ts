// Client-side image preparation for avatar uploads.
//
// Normalising in the browser rather than at the storage layer keeps a 6 MB phone
// photo from ever leaving the device: what gets uploaded is always a small,
// square, predictable file, so the stored object stays well inside the
// `public-media` bucket's 10 MB / image-mime constraints and every consumer can
// render it at any size without layout surprises.

/** Edge length, in px, of the stored avatar. 512 covers 2× a 256px display. */
export const AVATAR_SIZE = 512;

/** Accepted input types — a subset of what the `public-media` bucket allows. */
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

/** Largest file the picker accepts *before* downscaling. */
export const AVATAR_MAX_MB = 8;

/** Encoded output type. WebP is in the bucket's allow-list and ~30% smaller. */
const OUTPUT_TYPE = 'image/webp';

/**
 * Centre-crop `file` to a square and downscale it to `size`×`size`.
 *
 * Cropping to the centre (rather than letterboxing) matches how the avatar is
 * displayed everywhere — a circle — so what the user previews is what they get.
 * Throws when the file isn't a decodable image, which the caller surfaces as a
 * field error rather than a silent no-op.
 */
export async function toSquareAvatar(file: File, size = AVATAR_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That file couldn't be read as an image.");
  });

  try {
    const edge = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - edge) / 2;
    const sy = (bitmap.height - edge) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process the image.');
    ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, size, size);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('Your browser could not process the image.')),
        OUTPUT_TYPE,
        0.9,
      );
    });
  } finally {
    bitmap.close();
  }
}

/** File extension for the encoded output, used to build the storage object key. */
export const AVATAR_EXTENSION = 'webp';
