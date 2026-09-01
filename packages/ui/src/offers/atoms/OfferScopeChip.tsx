'use client';
import { Chip, Tooltip } from '@mui/material';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import { offerScopeLabel } from '../schema/offerCopy';
import type { OfferScope } from '../types';

export type OfferScopeChipProps = {
  scope: OfferScope | string | null | undefined;
  size?: 'small' | 'medium';
};

/** What the tooltip has to say that the label cannot fit. */
const NOTES: Record<string, string> = {
  tier: 'This saving applies to this tier only. Other tiers of this package are at their list price.',
  package: 'This saving applies to every tier of this package.',
  campaign: 'Part of a campaign covering several of this vendor’s packages.',
  vendor: 'Applies to everything this vendor sells.',
};

/**
 * How wide the offer reaches.
 *
 * The one fact a client most often gets wrong about a discount, and the one
 * that costs the most when they do: arriving at checkout having chosen Platinum
 * on the strength of a saving that only ever covered Gold. Saying it on the
 * card is cheaper than explaining it in a message thread afterwards.
 *
 * Renders nothing for an unknown scope rather than an empty chip — a read that
 * did not select `scope` should leave no trace on the layout.
 */
export function OfferScopeChip({ scope, size = 'small' }: OfferScopeChipProps) {
  const label = offerScopeLabel(scope);
  if (!label) return null;

  return (
    <Tooltip title={NOTES[String(scope)] ?? ''}>
      <Chip
        size={size}
        variant="outlined"
        icon={<SellRoundedIcon />}
        label={label}
        sx={{ color: 'text.secondary' }}
      />
    </Tooltip>
  );
}
