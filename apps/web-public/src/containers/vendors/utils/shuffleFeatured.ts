import type { VendorListItem } from './filterVendors';

/** Rotation window in ms — the featured order is stable within it, then reshuffles. */
const ROTATION_WINDOW_MS = 15 * 60 * 1000; // 15 min, matches the page's ISR revalidate.

/** Small, fast seeded PRNG (mulberry32) — deterministic given a seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns the featured vendors in a shuffled order so every paying vendor
 * rotates through prominent spotlight positions rather than the same best-rated
 * few always leading. The shuffle is seeded by the current rotation window, so
 * the order is identical for every render within that window (SSR/ISR-safe — no
 * hydration mismatch) and reshuffles when the window rolls over. Pure: the input
 * array is not mutated.
 */
export function shuffleFeatured(
  vendors: VendorListItem[],
  now: number = Date.now(),
): VendorListItem[] {
  const seed = Math.floor(now / ROTATION_WINDOW_MS);
  const rand = mulberry32(seed);
  const out = [...vendors];
  // Fisher–Yates using the seeded PRNG.
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
