'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { OfferSavingBadge } from '../atoms/OfferSavingBadge';
import { OfferDeadlineChip } from '../atoms/OfferDeadlineChip';
import { OfferCodeChip } from '../atoms/OfferCodeChip';
import { useOfferClock } from '../hooks/useOfferClock';
import type { OfferModel } from '../types';

export type OfferStripProps = {
  offers: readonly OfferModel[];
  /** Per-offer trailing slot — "Use this offer", a menu, a moderation chip. */
  renderAction?: (offer: OfferModel) => ReactNode;
  title?: string;
};

/**
 * What a vendor is currently running, above the fold on their profile.
 *
 * Rows rather than cards, and that is the point of it being a separate
 * component from `OfferGrid`. This sits at the top of a profile whose subject
 * is the VENDOR: a grid of full offer cards there would out-weigh the packages
 * and reviews the visitor came for, and a profile that leads with three big
 * discount cards reads as a clearance sale rather than as a business.
 *
 * Each row is one line on a desktop and wraps to three on a phone. Nothing
 * truncates — the code is the part a client has to act on, and a row that drops
 * it to stay on one line has dropped the only thing on it that does anything.
 *
 * Renders nothing when there are no offers. A profile is not incomplete for
 * having no sale on; an empty "Current offers" heading implies one is missing.
 */
export function OfferStrip({ offers, renderAction, title = 'Current offers' }: OfferStripProps) {
  const now = useOfferClock();

  if (offers.length === 0) return null;

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.32 : 0.25),
        bgcolor: (t) => alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.1 : 0.05),
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1 }}
      >
        <LocalOfferRoundedIcon sx={{ color: 'success.main', fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
          {title}
        </Typography>
      </Stack>

      <Stack sx={{ px: { xs: 2, sm: 2.5 }, pb: 2 }}>
        {offers.map((offer, index) => (
          <Stack
            key={offer.discount_id}
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1, md: 2 }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            sx={{
              py: 1.5,
              // Separators between rows only — a rule under the last row would
              // read as a divider from the section below it.
              borderTop: index === 0 ? 'none' : '1px solid',
              borderColor: (t) => alpha(t.palette.success.main, 0.18),
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {offer.title}
              </Typography>
              {offer.description && (
                <Typography variant="caption" color="text.secondary">
                  {offer.description}
                </Typography>
              )}
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flexWrap: 'wrap', gap: 1, flexShrink: 0 }}
            >
              <OfferSavingBadge offer={offer} />
              <OfferDeadlineChip endsAt={offer.ends_at} now={now} />
              <OfferCodeChip code={offer.code} isAutomatic={offer.is_automatic} />
              {renderAction?.(offer)}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
