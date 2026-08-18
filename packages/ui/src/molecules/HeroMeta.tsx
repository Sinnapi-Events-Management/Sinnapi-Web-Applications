'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export type HeroMetaFact = {
  icon: ReactNode;
  text: string;
};

/** One icon-and-label fact in a hero's quick-glance row. */
export function HeroMetaItem({ icon, text }: HeroMetaFact) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ opacity: 0.92, minWidth: 0 }}>
      <Box sx={{ display: 'flex', '& svg': { fontSize: 18 } }}>{icon}</Box>
      <Typography variant="body2" noWrap>
        {text}
      </Typography>
    </Stack>
  );
}

export type HeroMetaStripProps = {
  /**
   * The facts to show. Falsy entries are dropped rather than rendered as "—",
   * so callers can inline conditionals — `location && { … }` — without
   * filtering first. A hero that advertises what a record is *missing* is
   * noise, and the cards below it account for every field either way.
   *
   * The falsy half of the union is spelled out rather than left as `unknown`
   * because `value && { … }` evaluates to `value`, not to `false`, when the
   * guard is a nullable string — which is what most of these guards are.
   */
  facts: (HeroMetaFact | false | null | undefined | '' | 0)[];
};

/**
 * The row of facts under a detail hero: the handful of values worth reading
 * before scrolling.
 *
 * Four portals' detail pages had grown their own byte-identical copy of this
 * and of `HeroMetaItem` — client, vendor and admin bookings, and now
 * quotations. The only thing that ever differed was which facts went in, which
 * is exactly what a prop is for.
 */
export function HeroMetaStrip({ facts }: HeroMetaStripProps) {
  const items = facts.filter(Boolean) as HeroMetaFact[];

  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap gap={{ xs: 1.5, sm: 3 }}>
      {items.map((fact, i) => (
        <HeroMetaItem key={i} icon={fact.icon} text={fact.text} />
      ))}
    </Stack>
  );
}
