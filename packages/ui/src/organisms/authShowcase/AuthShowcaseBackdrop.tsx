'use client';
import { Box } from '../../atoms/Layout';
import { alpha } from '../../system';
import { useReducedMotion } from './hooks/useReducedMotion';
import type { AuthShowcaseBackdrop as Backdrop } from './types';

/**
 * Full-bleed media plus the two scrims that make the frosted card legible on top
 * of it: a brand-teal diagonal wash and a soft vignette for depth.
 */
export function AuthShowcaseBackdrop({ backdrop }: { backdrop: Backdrop }) {
  const reducedMotion = useReducedMotion();
  const blur = backdrop.blur ?? backdrop.kind === 'video';

  return (
    <>
      {backdrop.kind === 'video' ? (
        <Box
          component="video"
          aria-hidden
          src={backdrop.src}
          poster={backdrop.poster}
          // Reduced motion gets the poster/first frame instead of a loop.
          autoPlay={!reducedMotion}
          loop={!reducedMotion}
          muted
          playsInline
          controls={false}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Scaled up so the blur's soft edge falls outside the viewport. Kept
            // tight: the panel is portrait-ish, so `cover` already crops hard —
            // every extra percent here is composition thrown away. 2px of blur
            // needs only a few px of overscan.
            transform: blur ? 'scale(1.06)' : 'none',
            filter: blur ? 'blur(0px) brightness(0.85) saturate(1.1)' : 'none',
          }}
        />
      ) : (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${backdrop.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: blur ? 'scale(1.15)' : 'none',
            filter: blur ? 'blur(2px)' : 'none',
          }}
        />
      )}

      {/* Legibility wash — brand teal diagonal grounding the frosted card. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: (t) =>
            `linear-gradient(160deg, ${alpha(t.palette.primary.dark, 0.42)} 0%, ${alpha(
              t.palette.primary.dark,
              0.16,
            )} 45%, ${alpha('#000000', 0.34)} 100%)`,
        }}
      />
      {/* Vignette so the card reads as lifted off the media. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(120% 90% at 50% 12%, transparent 40%, ${alpha(
            '#000000',
            0.28,
          )} 100%)`,
        }}
      />
    </>
  );
}
