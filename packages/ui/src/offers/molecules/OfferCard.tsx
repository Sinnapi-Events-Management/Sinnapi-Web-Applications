'use client';
import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { OfferSavingBadge } from '../atoms/OfferSavingBadge';
import { OfferDeadlineChip } from '../atoms/OfferDeadlineChip';
import { OfferCodeChip } from '../atoms/OfferCodeChip';
import { OfferConditions } from './OfferConditions';
import type { OfferModel } from '../types';

export type OfferCardProps = {
  offer: OfferModel;
  /** The clock every card in this list was resolved against. */
  now?: number;
  /**
   * Above the title — who is running it, or which packages it covers. The card
   * does not fetch this: three different reads supply three different framings
   * and none of them belongs inside a presentational card.
   */
  eyebrow?: ReactNode;
  /** The price block, when the caller has a tier to price. */
  price?: ReactNode;
  /** The call to action. Every audience's is different; none is defaulted. */
  action?: ReactNode;
  /** Header slot on the right — a menu, a featured star, a moderation chip. */
  headerAction?: ReactNode;
  /** `plain` drops the surface, for a card already inside one. */
  variant?: 'card' | 'plain';
};

/**
 * One offer, as every audience reads it.
 *
 * The counterpart to `PackageShowcase`: one renderer across the client portal,
 * the marketing site, the vendor's own list and the console, so the saving a
 * visitor is shown before signing in is the saving they are shown after. The
 * moment those diverge, the price on the public page stops being trustworthy —
 * which is the same argument that made `PackageShowcase` one component, and it
 * applies harder here because this card's entire subject is a claim about money.
 *
 * The order is the order a buyer reads in: how much (the badge), what it is
 * (the title), what it costs after (the price), what the catch is (conditions),
 * and only then how to claim it. Conditions BEFORE the action on purpose — a
 * client who has already clicked has stopped reading, and the minimum spend is
 * the thing they most need to have seen.
 *
 * The banner, where a campaign has one, is the vendor's own artwork and is
 * given a fixed aspect ratio rather than a fixed height: this card sits three
 * across on a desktop and full-bleed on a phone, and a height that suits one
 * crops the other.
 */
export function OfferCard({
  offer,
  now,
  eyebrow,
  price,
  action,
  headerAction,
  variant = 'card',
}: OfferCardProps) {
  const body = (
    <Stack spacing={1.75}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {eyebrow && (
            <Box sx={{ mb: 0.75 }}>
              {typeof eyebrow === 'string' ? (
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ letterSpacing: '0.1em' }}
                >
                  {eyebrow}
                </Typography>
              ) : (
                eyebrow
              )}
            </Box>
          )}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <OfferSavingBadge offer={offer} tone="solid" />
            <OfferDeadlineChip endsAt={offer.ends_at} now={now} />
          </Stack>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1, lineHeight: 1.3 }}>
            {offer.title}
          </Typography>

          {offer.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {offer.description}
            </Typography>
          )}
        </Box>
        {headerAction}
      </Stack>

      {price}

      <OfferConditions offer={offer} />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <OfferCodeChip code={offer.code} isAutomatic={offer.is_automatic} size="medium" />
        {action && <Box sx={{ flex: 1, minWidth: 0 }}>{action}</Box>}
      </Stack>
    </Stack>
  );

  if (variant === 'plain') return body;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // A hairline of the saving colour down the leading edge, so a column of
        // mixed cards reads as offers without every card being tinted green.
        borderLeft: '3px solid',
        borderLeftColor: (t) => alpha(t.palette.success.main, 0.7),
      }}
    >
      {offer.banner_url && (
        <Box
          component="img"
          src={offer.banner_url}
          alt=""
          loading="lazy"
          sx={{
            display: 'block',
            width: '100%',
            aspectRatio: '16 / 7',
            objectFit: 'cover',
            bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
          }}
        />
      )}
      <Box sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, display: 'flex' }}>
        <Box sx={{ width: '100%' }}>{body}</Box>
      </Box>
    </Paper>
  );
}
