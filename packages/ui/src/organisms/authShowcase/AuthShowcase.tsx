'use client';
import { Box } from '../../atoms/Layout';
import { AuthGlassCard } from './AuthGlassCard';
import { AuthShowcaseBackdrop } from './AuthShowcaseBackdrop';
import { AuthShowcaseBrand } from './AuthShowcaseBrand';
import { AuthShowcaseCta } from './AuthShowcaseCta';
import { AuthShowcaseIndicators } from './AuthShowcaseIndicators';
import { AuthShowcaseSlides } from './AuthShowcaseSlides';
import { useAuthShowcase } from './hooks/useAuthShowcase';
import {
  AUTH_SHOWCASE_ROTATE_MS,
  type AuthShowcaseBackdrop as Backdrop,
  type AuthShowcaseBrand as Brand,
  type AuthShowcaseCta as Cta,
  type AuthShowcaseSlide as Slide,
} from './types';

export interface AuthShowcaseProps {
  brand: Brand;
  /** Value props rotated in the frosted card. Each app owns its own copy. */
  slides: Slide[];
  backdrop: Backdrop;
  /** Optional closing action, e.g. "browse vendors" on the public site. */
  cta?: Cta;
  rotateMs?: number;
}

/**
 * Marketing panel for the split-screen auth screens: full-bleed media behind a
 * frosted-glass card whose value props cross-slide. Content, media and the CTA
 * are all injected, so admin, client and vendor portals share one treatment
 * while speaking to their own audience.
 */
export function AuthShowcase({
  brand,
  slides,
  backdrop,
  cta,
  rotateMs = AUTH_SHOWCASE_ROTATE_MS,
}: AuthShowcaseProps) {
  const { index, goTo, autoRotating } = useAuthShowcase({ count: slides.length, rotateMs });

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        minHeight: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Tighter at md so the card still fits a short laptop viewport.
        p: { md: 4, lg: 7 },
      }}
    >
      <AuthShowcaseBackdrop backdrop={backdrop} />

      {/* `textAlign` centres the copy; the rows inside brand, stats and the CTA
          centre themselves. The card hugs its content vertically — the slide
          stack is only as tall as the tallest slide — so apps with lean copy
          get a compact card rather than one padded out to a fixed height. */}
      <AuthGlassCard spacing={{ md: 3, lg: 4 }} sx={{ textAlign: 'center' }}>
        <AuthShowcaseBrand brand={brand} />
        <AuthShowcaseSlides slides={slides} activeIndex={index} />
        {slides.length > 1 && (
          <AuthShowcaseIndicators
            count={slides.length}
            activeIndex={index}
            rotateMs={rotateMs}
            // No timer running means no progress to animate — the pill just fills.
            animateProgress={autoRotating}
            onSelect={goTo}
          />
        )}
        {cta && <AuthShowcaseCta cta={cta} />}
      </AuthGlassCard>
    </Box>
  );
}
