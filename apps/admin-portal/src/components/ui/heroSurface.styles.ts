import type { SxProps } from '@sinnapi/ui';
import type { Theme } from '@sinnapi/ui/theme';

/**
 * Style tokens for the detail-page hero banner (see {@link ../HeroSurface}).
 *
 * Design language — a calm, near-neutral *elevated surface*, the pattern modern
 * products (Linear / Stripe / Vercel) use for page headers: a clean card that
 * lifts off the canvas with a hairline border and a soft shadow rather than a
 * saturated colour fill. Colour is spent only where it carries meaning — status
 * chips, the avatar, icons — plus a single whisper of warm brand glow in one
 * corner. Light mode is white-on-cream; dark mode is a raised neutral panel.
 *
 * The root publishes a small set of CSS custom properties that flip with the
 * colour scheme; content references them through the `hero*Sx` helpers below.
 * One source of truth — add a hero and it inherits the same treatment.
 */

// Near-white surface with a barely-there warm tilt, so the card reads as a
// distinct sheet above the pale-gold page canvas without adding visible colour.
const LIGHT_BG = 'linear-gradient(180deg, #FFFFFF 0%, #FBFAF8 100%)';
// Raised neutral panel a step above the near-black canvas (#100B16) / paper
// (#1A1320), with the same faint warm tilt.
const DARK_BG = 'linear-gradient(180deg, #201826 0%, #17111E 100%)';

// The dark-scheme selector emitted by the CSS-vars provider. Equal to
// `theme.getColorSchemeSelector('dark')` for the default `data-mui-color-scheme`
// attribute, inlined because the re-exported base `Theme` type doesn't surface
// that helper.
const DARK_SELECTOR = '[data-mui-color-scheme="dark"] &';

export const heroRootSx: SxProps<Theme> = () => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 4,
  p: { xs: 2.5, sm: 4 },
  mb: 3,

  // --- light mode: white sheet, ink text ---
  color: '#1A1320', // text.primary — crisp, high-contrast reading
  background: LIGHT_BG,
  border: '1px solid rgba(26, 19, 32, 0.08)',
  boxShadow: '0 1px 2px rgba(16, 11, 22, 0.04), 0 12px 32px -20px rgba(16, 11, 22, 0.22)',
  // Neutral translucent inks for chips / ghost buttons over the light sheet.
  '--hero-overlay': 'rgba(26, 19, 32, 0.045)',
  '--hero-overlay-strong': 'rgba(26, 19, 32, 0.07)',
  '--hero-overlay-hover': 'rgba(26, 19, 32, 0.09)',
  '--hero-border': 'rgba(26, 19, 32, 0.14)',
  '--hero-divider': 'rgba(26, 19, 32, 0.08)',
  // The one touch of brand: a faint warm gold glow (secondary.main @ 8%).
  '--hero-glow': 'rgba(200, 151, 58, 0.08)',

  // --- dark mode: raised neutral panel, warm-white text ---
  [DARK_SELECTOR]: {
    color: '#F2F0F4', // text.primary (dark)
    background: DARK_BG,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 14px 34px -20px rgba(0, 0, 0, 0.65)',
    '--hero-overlay': 'rgba(255, 255, 255, 0.06)',
    '--hero-overlay-strong': 'rgba(255, 255, 255, 0.10)',
    '--hero-overlay-hover': 'rgba(255, 255, 255, 0.13)',
    '--hero-border': 'rgba(255, 255, 255, 0.16)',
    '--hero-divider': 'rgba(255, 255, 255, 0.10)',
    '--hero-glow': 'rgba(200, 151, 58, 0.10)',
  },
});

// Soft ambient corner glow — large and heavily blurred so it reads as a gentle
// wash of warmth rather than a hard disc.
export const heroGlowSx: SxProps<Theme> = {
  position: 'absolute',
  top: -140,
  right: -120,
  width: 360,
  height: 360,
  borderRadius: '50%',
  bgcolor: 'var(--hero-glow)',
  filter: 'blur(60px)',
  pointerEvents: 'none',
};

/** Translucent "ghost" button that sits on the hero (Back / secondary actions). */
export const heroGhostSx = {
  color: 'inherit',
  bgcolor: 'var(--hero-overlay)',
  '&:hover': { bgcolor: 'var(--hero-overlay-hover)' },
} as const;

/** Filled translucent chip on the hero; its icon inherits the foreground ink. */
export const heroChipSx = {
  color: 'inherit',
  bgcolor: 'var(--hero-overlay)',
  '& .MuiChip-icon': { color: 'inherit' },
} as const;

/** Divider tuned to the hero foreground so it reads on both schemes. */
export const heroDividerSx = { borderColor: 'var(--hero-divider)' } as const;

/** Avatar treatment for the profile-style heroes. */
export const heroAvatarSx = {
  bgcolor: 'var(--hero-overlay-strong)',
  color: 'inherit',
  border: '2px solid',
  borderColor: 'var(--hero-border)',
} as const;
