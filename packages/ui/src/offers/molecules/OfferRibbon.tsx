'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { OfferDeadlineChip } from '../atoms/OfferDeadlineChip';
import { OfferCodeChip } from '../atoms/OfferCodeChip';
import { offerHeadline, offerScopeLabel } from '../schema/offerCopy';
import type { OfferModel } from '../types';

export type OfferRibbonProps = {
  offer: OfferModel;
  /** The clock the whole screen was resolved against. */
  now?: number;
  /** A saving already computed for the tier on screen, in that tier's currency. */
  savingLabel?: string | null;
  /**
   * Why the saving is the figure it is, when the offer's headline does not
   * already say — a ceiling that bit, most often. Sits with the scope, because
   * both answer "what does this actually cover".
   */
  note?: string | null;
  action?: ReactNode;
  dense?: boolean;
};

/**
 * The strip that says a package is on offer, at the top of the thing it is an
 * offer on.
 *
 * Placed ABOVE the price rather than beside it, and that placement is the whole
 * design: a client reading a discounted figure needs to know it is discounted
 * before they read it, or the number lands as the vendor's ordinary price and
 * the saving does no work. A badge tucked beside the total is read after the
 * decision it was meant to influence.
 *
 * Tinted with `success`, not the brand gold. Gold is this platform's chrome —
 * every card, header and button already carries it — so a gold ribbon reads as
 * furniture. The tint is mixed through `alpha()` over the palette rather than
 * fixed, so it sits correctly on the light canvas and the warm dark one without
 * a second definition.
 *
 * Wraps rather than truncates. On a phone the headline, the deadline and the
 * code stack; a single-line ribbon would drop the code, which is the one part
 * a client has to be able to act on.
 *
 * THE CHIPS WRAP TO THEIR OWN LINE BEFORE THE HEADLINE GIVES UP ANY MORE WIDTH
 * The chip group used to be `flexShrink: 0`, which meant it always claimed its
 * full max-content width — "8 days left" plus "Applied automatically" is over
 * 500px at the portal's type scale — and the headline, as the only flexible
 * sibling, absorbed the entire deficit. In a half-width package card that left
 * it around 70px: "Save UGX 100,000 — Early bird off 20%" rendered one word per
 * line down the side of the ribbon. Its own `flexWrap` could never rescue it,
 * because an item that refuses to shrink is never handed less than max-content
 * and so never has a reason to wrap.
 *
 * The row wraps instead. A `minWidth` floor on the headline is what drives it:
 * flex line-breaking measures hypothetical main sizes, so the floor is what
 * tells the layout that headline-plus-chips does not fit and the chips belong
 * on the next line. Below that the group shrinks and its own wrap takes over,
 * so a genuinely narrow card degrades by stacking chips rather than by
 * overflowing.
 */
export function OfferRibbon({ offer, now, savingLabel, note, action, dense }: OfferRibbonProps) {
  const scope = offerScopeLabel(offer.scope);
  // One caption, not two stacked ones: scope and note are both qualifiers on
  // the headline above them, and a second line of small grey text reads as a
  // second thought rather than as part of the same sentence.
  const caption = [scope, note].filter(Boolean).join(' · ');

  return (
    <Box
      sx={{
        px: dense ? 1.5 : 2,
        py: dense ? 1 : 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.35 : 0.28),
        bgcolor: (t) => alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.14 : 0.07),
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 1.5 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        // `useFlexGap` so the spacing survives a wrapped row: Stack's default
        // margin-based spacing indents the first item of every line after the
        // first, which is exactly the case this wrap creates.
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          // The floor is load-bearing, not cosmetic — see the note above. It is
          // lifted at `xs`, where the row is a column and a width floor would
          // only push the ribbon wider than its card.
          sx={{ flex: 1, minWidth: { xs: 0, sm: 240 } }}
        >
          <LocalOfferRoundedIcon sx={{ color: 'success.main', fontSize: 20, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
              {savingLabel ? `Save ${savingLabel}` : offerHeadline(offer)}
              {offer.title && offer.title !== offerHeadline(offer) ? ` — ${offer.title}` : ''}
            </Typography>
            {caption && (
              <Typography variant="caption" color="text.secondary">
                {caption}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          useFlexGap
          // Allowed to shrink, so that on a card too narrow for a second line
          // of its own the group compresses and wraps internally instead of
          // running past the ribbon's edge.
          sx={{ flexWrap: 'wrap', minWidth: 0 }}
        >
          <OfferDeadlineChip endsAt={offer.ends_at} now={now} />
          <OfferCodeChip code={offer.code} isAutomatic={offer.is_automatic} />
          {action}
        </Stack>
      </Stack>
    </Box>
  );
}
