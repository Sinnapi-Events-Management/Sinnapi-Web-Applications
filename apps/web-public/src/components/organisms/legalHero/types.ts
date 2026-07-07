import type { ElementType } from 'react';
import type { LocalImage } from '@/lib/assets';

/**
 * Per-page visual identity for a legal hero. Authored once in each legal page's
 * `data/hero.ts` so the shared `LegalHero` stays generic and every page reads as
 * distinct (its own eyebrow, icon, photo, accent and voice).
 */
export interface LegalHeroChrome {
  /** Short kicker above the title, e.g. "Vendor agreement". */
  eyebrow: string;
  /** Icon shown inside the eyebrow chip. */
  Icon: ElementType;
  /** One- or two-sentence framing line beneath the title. */
  tagline: string;
  /** Full-bleed background photo for this page's hero. */
  image: LocalImage;
  /** Optional accent tint (hex token) for the corner glow. */
  accentColor?: string;
}
