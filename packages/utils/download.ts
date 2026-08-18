// Browser file downloads. No framework, no design system — just the DOM dance
// every "save this file" button otherwise reinvents.

/**
 * Decode base64 to bytes.
 *
 * `atob` yields a binary *string*, one character per byte, which is not a file:
 * handing it to `new Blob([...])` UTF-8-encodes it and silently corrupts every
 * byte above 0x7F. For a PDF that is most of them, and the damage shows up only
 * when the reader refuses to open the result — so the copy through a
 * `Uint8Array` is the whole point of this function existing.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Save bytes to the user's downloads as `fileName`.
 *
 * The object URL is revoked on the next tick rather than immediately: Safari
 * reads the href asynchronously after the synthetic click, and revoking in the
 * same frame gives it a dead URL and no download.
 */
export function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string): void {
  // `Uint8Array` became generic over its buffer in TS 5.7, so the DOM's
  // `BlobPart` — which insists on a plain `ArrayBuffer` — no longer accepts one
  // whose buffer could in principle be shared. Ours never is, and `Blob` has
  // taken typed arrays since it existed; the cast says so without weakening the
  // parameter type for callers.
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `downloadBytes` for a payload that arrived base64-encoded over JSON. */
export function downloadBase64File(base64: string, fileName: string, mimeType: string): void {
  downloadBytes(base64ToBytes(base64), fileName, mimeType);
}
