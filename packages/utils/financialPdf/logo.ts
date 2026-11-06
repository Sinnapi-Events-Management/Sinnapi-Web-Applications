/**
 * The vendor's logo, ready for jsPDF.
 *
 * Logos live in `public-media` as JPEG, PNG, WebP or AVIF. jsPDF embeds PNG
 * and JPEG only, so the browser decodes whatever it is and redraws it to a
 * canvas: square-cropped like the preview's `object-fit: cover`, with the
 * same rounded corners, exported as PNG.
 *
 * Best-effort by design. A logo that is slow, missing or blocked must never
 * stop a vendor downloading their invoice — `null` makes the renderer draw
 * the initials tile instead, exactly as the preview does with no logo.
 */
export type PdfLogo = { dataUrl: string };

const SIZE_PX = 256;
const RADIUS_PX = 48;

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

    const canvas = document.createElement('canvas');
    canvas.width = SIZE_PX;
    canvas.height = SIZE_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.beginPath();
    ctx.moveTo(RADIUS_PX, 0);
    ctx.arcTo(SIZE_PX, 0, SIZE_PX, SIZE_PX, RADIUS_PX);
    ctx.arcTo(SIZE_PX, SIZE_PX, 0, SIZE_PX, RADIUS_PX);
    ctx.arcTo(0, SIZE_PX, 0, 0, RADIUS_PX);
    ctx.arcTo(0, 0, SIZE_PX, 0, RADIUS_PX);
    ctx.closePath();
    ctx.clip();

    const side = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      SIZE_PX,
      SIZE_PX,
    );
    bitmap.close();
    return { dataUrl: canvas.toDataURL('image/png') };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
