// Lightweight types + helper shared by the preview dialog and the hooks that
// drive it. Kept separate from DocumentPreviewDialog.tsx so importing these does
// NOT pull the heavy react-pdf / pdfjs bundle — the dialog itself is lazy-loaded.

export type DocKind = 'image' | 'pdf' | 'other';

export type PreviewDoc = {
  /** Human label shown in the header, e.g. "National ID". */
  title: string;
  /** Short-lived signed URL to the file (empty while the URL is being minted). */
  url: string;
  /** Suggested filename for downloads. */
  fileName: string;
  kind: DocKind;
};

/** Map a storage path's extension to a preview strategy. */
export function docKindFromPath(path: string): DocKind {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'svg'].includes(ext)) return 'image';
  if (['heic', 'heif'].includes(ext)) return 'other'; // browsers can't render these inline
  if (ext === 'pdf') return 'pdf';
  return 'other';
}
