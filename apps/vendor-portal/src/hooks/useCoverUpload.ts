import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COVER_MAX_MB,
  publicMediaStorage,
  toCoverImage,
  validateImageFile,
  vendorCoverPath,
} from '@/lib/packageCover';

/**
 * Picking, preparing and uploading a 16:7 cover image for a vendor's feature.
 *
 * Shared by every screen that puts a wide photograph on a card — package
 * covers, promotion banners — because the hard parts are identical and the only
 * real difference is which folder the object lands in. Forking it per feature is
 * how two cards end up accepting different file sizes.
 *
 * The URL is handed back to the caller rather than written anywhere: the cover
 * is one field of a form that has not been saved yet, and committing it on pick
 * would leave a vendor who cancels the dialog with an image attached to a record
 * they never created.
 *
 * A local object URL stands in as the preview while the round trip is in
 * flight, so the picture appears the moment it is chosen instead of after the
 * upload. Object URLs are a document-lifetime allocation, so the outgoing one is
 * released on every swap and on unmount — a vendor trying five photos should not
 * leak five blobs.
 *
 * THE STAND-IN IS HANDED OVER, NOT LEFT IN PLACE
 * Once the stored URL exists the local one has no further job, and keeping it
 * makes the field's displayed image depend on a handle that is scoped to this
 * document and revoked on unmount — while every other surface reads the stored
 * URL. That divergence is a bug waiting to be reported as "it saved but it
 * disappeared". So the object URL is released the moment the stored one takes
 * over, and the stored one is decoded FIRST so the swap does not blink: the
 * upload is not reported as finished until the thing it produced can be drawn.
 */
/**
 * Resolves once `url` has been fetched and decoded, or rejects if it cannot be.
 *
 * A detached `Image` rather than a `fetch`: the point is to warm the same cache
 * entry the `<img>` in the field will read, which a `fetch` of a cross-origin
 * URL would not reliably do.
 */
function decodeImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('unloadable'));
    image.src = url;
  });
}

export function useCoverUpload(
  folder: string,
  vendorId: string,
  onUploaded: (url: string) => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const setPreviewUrl = useCallback((next: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setPreview(next);
  }, []);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      // Checked before any decoding work, so an obviously-too-large file fails
      // instantly rather than after a multi-megabyte read.
      const rejection = validateImageFile(file, COVER_MAX_MB);
      if (rejection) {
        setError(rejection);
        return;
      }

      setBusy(true);
      setPreviewUrl(URL.createObjectURL(file));

      try {
        const blob = await toCoverImage(file);
        const path = vendorCoverPath(folder, vendorId);
        await publicMediaStorage.upload(path, blob);

        const url = publicMediaStorage.publicUrl(path);
        // Warmed before the handover, and failure here is not the upload's
        // failure — the object is stored either way, and the field falls back
        // to its own empty state if the URL genuinely will not render.
        await decodeImage(url).catch(() => undefined);

        onUploaded(url);
        setPreviewUrl(null);
      } catch (uploadError) {
        setPreviewUrl(null);
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "That image couldn't be uploaded. Try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [folder, vendorId, onUploaded, setPreviewUrl],
  );

  const clear = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
    onUploaded('');
  }, [onUploaded, setPreviewUrl]);

  return { busy, error, preview, upload, clear };
}
