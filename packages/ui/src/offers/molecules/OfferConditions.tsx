'use client';
import { Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { OfferScopeChip } from '../atoms/OfferScopeChip';
import { offerConditions } from '../schema/offerCopy';
import type { OfferModel } from '../types';

export type OfferConditionsProps = {
  offer: OfferModel;
  /** Hidden where the scope is already stated by the surrounding layout. */
  showScope?: boolean;
};

/**
 * The qualifiers on a saving, and the vendor's own fine print.
 *
 * This is the block that keeps a discount from becoming a dispute. The three
 * things a client is entitled to know before they act on a price — what the
 * booking has to be worth, what the saving is capped at, and how many are left
 * — are the three most common causes of "but the site said 20% off", and every
 * one of them is a fact the vendor already entered. Not rendering them is a
 * choice to withhold something the platform is holding.
 *
 * `terms` is the vendor's free text and goes last, visually quieter, because it
 * is the only part the platform did not generate and cannot vouch for.
 *
 * Renders nothing at all when there is nothing to qualify. An unconditional
 * offer should look unconditional; an empty "Conditions" heading implies terms
 * the reader then goes looking for.
 */
export function OfferConditions({ offer, showScope = true }: OfferConditionsProps) {
  const conditions = offerConditions(offer);
  const hasScope = showScope && Boolean(offer.scope);

  if (conditions.length === 0 && !offer.terms && !hasScope) return null;

  return (
    <Stack spacing={1}>
      {(conditions.length > 0 || hasScope) && (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {hasScope && <OfferScopeChip scope={offer.scope} />}
          {conditions.map((condition) => (
            <Typography
              key={condition}
              variant="caption"
              sx={{
                px: 1,
                py: 0.4,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >
              {condition}
            </Typography>
          ))}
        </Stack>
      )}

      {offer.terms && (
        <Stack direction="row" spacing={0.75} alignItems="flex-start">
          <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled', mt: '2px' }} />
          <Typography variant="caption" color="text.secondary">
            {offer.terms}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
