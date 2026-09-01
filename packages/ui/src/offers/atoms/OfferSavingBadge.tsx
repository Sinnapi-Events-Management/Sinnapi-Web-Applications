'use client';
import { Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { offerHeadline } from '../schema/offerCopy';
import type { OfferModel } from '../types';

export type OfferSavingBadgeProps = {
  offer: OfferModel;
  size?: 'small' | 'medium';
  /**
   * `solid` for the one badge that is the point of the card. `soft` for a badge
   * sitting on a card whose subject is something else — a package, a vendor —
   * where a filled chip would out-shout the thing being sold.
   */
  tone?: 'solid' | 'soft';
};

/**
 * The claim, as a badge: `20% off`, `UGX 300,000 off`.
 *
 * The single most repeated element in this feature — it appears on package
 * cards in three apps, on vendor cards, on the offers directory and inside the
 * quote a client accepts — which is exactly why it is one component. A saving
 * rendered as an inline `<Chip>` at eight call sites is eight chances for the
 * platform to state a discount in a slightly different way.
 *
 * Colour comes from `success`, not from the brand accent. Gold is this
 * platform's ordinary chrome; a saving has to read as different from chrome or
 * it reads as decoration. `success` also survives both themes without a custom
 * palette entry, which a hand-mixed green would not.
 */
export function OfferSavingBadge({ offer, size = 'small', tone = 'soft' }: OfferSavingBadgeProps) {
  const label = offerHeadline(offer);
  if (!label) return null;

  return (
    <Chip
      size={size}
      icon={<LocalOfferRoundedIcon />}
      label={label}
      sx={{
        fontWeight: 700,
        // Tabular figures: a column of these in a grid should have its digits
        // line up rather than drift by the width of a "1".
        fontVariantNumeric: 'tabular-nums',
        ...(tone === 'solid'
          ? {
              bgcolor: 'success.main',
              color: 'success.contrastText',
              '& .MuiChip-icon': { color: 'inherit' },
            }
          : {
              // alpha() over the palette rather than a fixed tint, so the chip
              // sits correctly on both the light canvas and the warm dark one.
              bgcolor: (t) =>
                alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.22 : 0.14),
              color: 'success.main',
              '& .MuiChip-icon': { color: 'inherit' },
            }),
      }}
    />
  );
}
