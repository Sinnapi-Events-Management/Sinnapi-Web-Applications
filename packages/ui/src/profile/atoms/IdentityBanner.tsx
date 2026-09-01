'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';

export type IdentityBannerProps = {
  /**
   * Chips pinned to the banner's trailing edge. Left undefined when the surface
   * shows its badges under the name instead.
   */
  badges?: ReactNode;
};

/**
 * How far the picture below rises into the banner, in theme spacing units.
 *
 * Exported because the banner and the card have to agree on it: the card pulls the
 * picture up by exactly this much, and the banner reserves exactly this much below
 * its badges. Two hard-coded 7s that had to match would drift the first time either
 * side was touched.
 */
export const IDENTITY_AVATAR_OVERHANG = 7;

/** Height of the bare band, when there are no badges to make it taller. */
export const IDENTITY_BANNER_MIN_HEIGHT = 88;

/**
 * The tinted band an `IdentityCard` opens with, and the optional home for its
 * badges.
 *
 * A gradient rather than an image gives the card a header for nothing — no asset
 * to ship, no second surface, and it re-tints itself from the palette so the warm
 * dark scheme is covered without a second definition.
 *
 * ## Why the badges are in flow rather than absolutely positioned
 *
 * The picture below rises `IDENTITY_AVATAR_OVERHANG` into this band, so the bottom
 * of the band is already spoken for. Badges pinned to a corner of a fixed-height
 * band would land on the picture the moment they wrapped — which they do at a
 * narrow column width, or on a status with a long name like `Awaiting Vendor
 * Consent`. Instead they sit in normal flow above a reserved strip the height of
 * that overhang: a wrapped row makes the band taller, the picture moves down with
 * it, and the two can never meet whatever the status is called or however narrow
 * the column gets.
 */
export function IdentityBanner({ badges }: IdentityBannerProps) {
  return (
    <Box
      sx={{
        minHeight: IDENTITY_BANNER_MIN_HEIGHT,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        gap: 0.75,
        pt: 1.25,
        px: 1.25,
        // The strip the picture rises into. Never occupied by a badge.
        pb: IDENTITY_AVATAR_OVERHANG,
        background: (t) =>
          `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.18)}, ${alpha(
            t.palette.secondary.main,
            0.22,
          )})`,
      }}
    >
      {badges}
    </Box>
  );
}
