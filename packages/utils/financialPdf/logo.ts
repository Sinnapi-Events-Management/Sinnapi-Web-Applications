/**
 * The vendor's business logo, ready for jsPDF.
 *
 * One loader for every document Sinnapi prints — invoices, receipts and
 * quotations — so a vendor's logo looks the same on all three.
 *
 * Logos live in `public-media` as JPEG, PNG, WebP or AVIF. jsPDF embeds PNG
 * and JPEG only, so the browser decodes whatever it is and redraws it to a
 * canvas, exported as PNG (transparency kept). The logo keeps its own shape:
 * never cropped, never stretched — a wide wordmark keeps its ends, exactly as
 * the on-screen preview's `object-fit: contain` shows it.
 *
 * Best-effort by design. A logo that is slow, missing or blocked must never
 * stop a vendor or client downloading a document — `null` makes the renderer
 * draw the initials tile instead, exactly as the preview does with no logo.
 */
export type PdfLogo = {
  dataUrl: string;
  /** Intrinsic pixel size of `dataUrl`, so it can be drawn without distortion. */
  width: number;
  height: number;
};

/** Longest edge of the embedded image. ~300 DPI at the size it is drawn. */
const MAX_EDGE_PX = 640;

export async function loadLogo(
  url: string | null | undefined,
  timeoutMs = 5000,
): Promise<PdfLogo | null> {
  // https only: never a `data:`, `blob:`, `file:` or plain-http address.
  if (!url || !/^https:\/\//i.test(url) || typeof document === 'undefined') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, mode: 'cors' });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());

    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return { dataUrl: canvas.toDataURL('image/png'), width, height };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The size to draw `logo` at inside a `maxWidth` × `maxHeight` box, keeping
 * its shape. A logo without a known size (older callers) fills the height.
 */
export function fitLogo(
  logo: Pick<PdfLogo, 'width' | 'height'>,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (!logo.width || !logo.height) return { width: maxHeight, height: maxHeight };
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  return { width: logo.width * scale, height: logo.height * scale };
}
