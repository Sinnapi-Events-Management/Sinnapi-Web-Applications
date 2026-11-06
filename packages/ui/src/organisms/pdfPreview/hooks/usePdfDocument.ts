'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type UsePdfDocumentOptions = {
  /** Whether the document is offered at all; actions render nothing when false. */
  enabled: boolean;
  /** The name the file is saved under, e.g. `quotation-SQ123.pdf`. */
  fileName: string;
  /**
   * Builds the PDF. Pass a new function when the document's data changes —
   * the rendered file is cached per function, so preview-then-download
   * renders once, and a changed quote never serves a stale file.
   */
  render: () => Promise<Blob>;
};

const FAILED = 'The PDF could not be prepared. Try again.';

/** Hand a Blob to the browser's downloads. Revoked a tick later for Safari. */
function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Preview and download for a document built in the browser.
 *
 * Owns the parts every "Preview / Download PDF" pair gets wrong when written
 * twice: one render shared by both actions, the object URL's lifetime (made
 * on open, released on close and unmount), and one busy flag per action so
 * the right button spins.
 */
export function usePdfDocument({ enabled, fileName, render }: UsePdfDocumentOptions) {
  const [busy, setBusy] = useState<'preview' | 'download' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cache = useRef<{ render: () => Promise<Blob>; blob: Blob } | null>(null);

  const getBlob = useCallback(async () => {
    if (cache.current?.render === render) return cache.current.blob;
    const blob = await render();
    cache.current = { render, blob };
    return blob;
  }, [render]);

  // One live preview URL at a time; released whenever it is replaced or the
  // page goes away.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const openPreview = useCallback(async () => {
    setError(null);
    setPreviewOpen(true);
    setBusy('preview');
    try {
      setPreviewUrl(URL.createObjectURL(await getBlob()));
    } catch {
      setError(FAILED);
    } finally {
      setBusy(null);
    }
  }, [getBlob]);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewUrl(null);
  }, []);

  const download = useCallback(async () => {
    setError(null);
    setBusy('download');
    try {
      saveBlob(await getBlob(), fileName);
    } catch {
      setError(FAILED);
    } finally {
      setBusy(null);
    }
  }, [getBlob, fileName]);

  /** Opens the previewed file in the device's own PDF viewer (phones). */
  const openInViewer = useCallback(() => {
    if (previewUrl) window.open(previewUrl, '_blank', 'noopener');
  }, [previewUrl]);

  return {
    enabled,
    fileName,
    busy,
    error,
    clearError: useCallback(() => setError(null), []),
    previewOpen,
    previewUrl,
    openPreview,
    closePreview,
    openInViewer,
    download,
  };
}

export type PdfDocumentState = ReturnType<typeof usePdfDocument>;
