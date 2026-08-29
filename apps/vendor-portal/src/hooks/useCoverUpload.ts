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
 */
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
        onUploaded(publicMediaStorage.publicUrl(path));
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
