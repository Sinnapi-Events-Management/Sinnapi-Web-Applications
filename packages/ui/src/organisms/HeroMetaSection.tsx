'use client';
import { Box, Divider } from '@mui/material';
import { HeroMetaStrip, hasPrimaryHeroFacts, type HeroMetaSlot } from '../molecules/HeroMeta';
import { heroDividerSx } from './heroSurface.styles';

export type HeroMetaSectionProps = {
  /** The quick-glance facts. Falsy slots drop out; see `HeroMetaStrip`. */
  facts: HeroMetaSlot[];
};

/**
 * The divider-and-facts foot of a detail hero, as one piece.
 *
 * It exists because the divider and the strip have to disappear together. Once
 * facts can be marked `secondary` — hidden on a phone so the tabs below start
 * higher — a hero whose facts are *all* secondary would otherwise draw a rule
 * across itself with nothing under it. A record with no price yet is exactly
 * that case: the total is the one fact a quotation hero keeps on mobile, and an
 * unpriced request has no total.
 *
 * So the visibility decision is made once, here, over the same list the strip
 * renders — rather than in each hero, where the two halves would be free to
 * disagree about whether there was anything to show.
 */
export function HeroMetaSection({ facts }: HeroMetaSectionProps) {
  // `md` matches the breakpoint `HeroMetaItem` hides secondary facts at. If one
  // moves, the other has to move with it.
  const display = hasPrimaryHeroFacts(facts) ? undefined : { xs: 'none', md: 'block' };

  return (
    <Box sx={{ display }}>
      <Divider sx={{ my: 2.5, ...heroDividerSx }} />
      <Box sx={{ position: 'relative' }}>
        <HeroMetaStrip facts={facts} />
      </Box>
    </Box>
  );
}
