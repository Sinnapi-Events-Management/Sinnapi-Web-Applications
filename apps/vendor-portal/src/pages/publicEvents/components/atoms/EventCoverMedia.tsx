import type { ReactNode } from 'react';
import { Box } from '@sinnapi/ui';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import CelebrationIcon from '@mui/icons-material/Celebration';

type EventCoverMediaProps = {
  /** The poster's image. Null falls back to the tinted panel below. */
  src: string | null;
  alt: string;
  /** Which fallback wash this event gets — see `coverAccentIndex`. */
  accent: number;
  /** Chips and pills laid over the bottom of the media. */
  overlay?: ReactNode;
};

/** The dark-scheme selector the CSS-variables provider emits. */
const DARK = '[data-mui-color-scheme="dark"] &';

/**
 * Fallback washes for an event with no cover, one per occasion bucket.
 *
 * Drawn from the palette's own families at low alpha rather than from fixed
 * hexes, so the placeholder reads as part of the product on either scheme
 * instead of a grey hole in the grid. Alpha runs higher in dark mode: the same
 * tint that lifts off a white card disappears into the warm dark panel.
 */
const WASHES = [
  { light: palette.light.secondary.main, dark: palette.dark.secondary.main },
  { light: palette.light.primary.main, dark: palette.dark.primary.main },
  { light: palette.light.info.main, dark: palette.dark.info.main },
  { light: palette.light.success.main, dark: palette.dark.success.main },
];

export const COVER_ACCENT_COUNT = WASHES.length;

/** Height of the media band. Shared with the skeleton so first paint doesn't reflow. */
export const COVER_HEIGHT = 156;

/**
 * The card's media band: the poster's cover image, or — when there isn't one —
 * a tinted panel keyed to the occasion.
 *
 * The fallback is the load-bearing half. `cover_image_url` is optional on a
 * brief, so a feed that only renders imagery when it exists produces a grid of
 * mismatched card heights and a scanning pattern that breaks every few rows. A
 * placeholder of the same height keeps the grid a grid, and colouring it by
 * occasion means the fallback still carries information rather than just
 * filling space.
 *
 * The overlay sits on a gradient scrim, not on the photo directly: a cover is
 * whatever the poster uploaded, and white text on an unknown image is a
 * legibility gamble.
 */
export default function EventCoverMedia({ src, alt, accent, overlay }: EventCoverMediaProps) {
  const wash = WASHES[accent % WASHES.length];

  return (
    <Box
      sx={{
        position: 'relative',
        height: COVER_HEIGHT,
        flexShrink: 0,
        overflow: 'hidden',
        bgcolor: withAlpha(palette.light.text.primary, 0.05),
        [DARK]: { bgcolor: withAlpha(palette.dark.text.primary, 0.05) },
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Box
          aria-hidden
          sx={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(135deg, ${withAlpha(wash.light, 0.22)} 0%, ${withAlpha(
              wash.light,
              0.06,
            )} 100%)`,
            color: withAlpha(palette.light.text.primary, 0.22),
            [DARK]: {
              background: `linear-gradient(135deg, ${withAlpha(
                wash.dark,
                0.26,
              )} 0%, ${withAlpha(wash.dark, 0.07)} 100%)`,
              color: withAlpha(palette.dark.text.primary, 0.26),
            },
          }}
        >
          <CelebrationIcon sx={{ fontSize: 44 }} />
        </Box>
      )}

      {overlay && (
        <Box
          sx={{
            position: 'absolute',
            inset: 'auto 0 0 0',
            p: 1,
            display: 'flex',
            gap: 0.75,
            flexWrap: 'wrap',
            // Scrim under the chips only — a full-surface wash would mute the
            // cover the poster chose.
            background: `linear-gradient(180deg, transparent 0%, ${withAlpha(
              palette.light.text.primary,
              0.42,
            )} 100%)`,
            [DARK]: {
              background: `linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.6) 100%)`,
            },
          }}
        >
          {overlay}
        </Box>
      )}
    </Box>
  );
}
