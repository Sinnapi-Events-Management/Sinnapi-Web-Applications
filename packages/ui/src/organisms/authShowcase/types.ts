import type { ElementType } from 'react';

/** How long a single slide holds before the carousel advances. */
export const AUTH_SHOWCASE_ROTATE_MS = 6000;

/** One value proposition in the showcase carousel. */
export interface AuthShowcaseSlide {
  /** Short headline — the hook that earns the next few seconds of attention. */
  title: string;
  /** One or two sentences expanding the headline. */
  body: string;
  /**
   * Optional glyph shown in a glass chip above the headline. Passed as a
   * component (e.g. a MUI `SvgIconComponent`), like the nav configs, so content
   * files stay plain `.ts` and the design system stays icon-set agnostic.
   */
  icon?: ElementType;
  /** Short trust markers rendered as pills under the body. */
  stats?: string[];
}

/** Call-to-action block pinned under the carousel. */
export interface AuthShowcaseCta {
  /** Button label. */
  label: string;
  href: string;
  /** One line of context above the button explaining where it leads. */
  caption?: string;
  /** Opens in a new tab with `rel="noopener"` — use for links leaving the app. */
  external?: boolean;
}

/** Logo + wordmark shown at the top of the card. */
export interface AuthShowcaseBrand {
  logoSrc: string;
  name: string;
  /** Small pill next to the wordmark, e.g. "Admin" or "Clients". */
  tagline?: string;
  /** Makes the brand mark a link (e.g. back to the marketing site). */
  href?: string;
}

/**
 * Full-bleed media behind the frosted card. Video is blurred by default so the
 * footage reads as motion rather than competing with the copy.
 */
export type AuthShowcaseBackdrop =
  | { kind: 'image'; src: string; blur?: boolean }
  | { kind: 'video'; src: string; poster?: string; blur?: boolean };
