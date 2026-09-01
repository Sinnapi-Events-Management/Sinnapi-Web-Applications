'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export type HeroMetaFact = {
  icon: ReactNode;
  text: string;
  /**
   * Drop this fact on a phone, keep it from `md` up.
   *
   * A hero is the first thing on a detail page and the tabs below it are the
   * second, so every row spent here is a row of pushing the sections further
   * down a screen that has few to spare. Marking the supporting facts secondary
   * leaves the phone showing only what identifies the record and what it is
   * worth; the rest is never lost, because the Overview section states every
   * one of them as a labelled row.
   *
   * Which facts qualify is the caller's judgement — the strip only honours the
   * flag. As a rule the money and the identity stay, and dates, titles and
   * stamps go.
   */
  secondary?: boolean;
};

/** One icon-and-label fact in a hero's quick-glance row. */
export function HeroMetaItem({ icon, text, secondary }: HeroMetaFact) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        opacity: 0.92,
        minWidth: 0,
        ...(secondary && { display: { xs: 'none', md: 'flex' } }),
      }}
    >
      <Box sx={{ display: 'flex', '& svg': { fontSize: 18 } }}>{icon}</Box>
      <Typography variant="body2" noWrap>
        {text}
      </Typography>
    </Stack>
  );
}

/**
 * The falsy half of a fact slot.
 *
 * Spelled out rather than left as `unknown` because `value && { … }` evaluates
 * to `value`, not to `false`, when the guard is a nullable string — which is
 * what most of these guards are.
 */
export type HeroMetaSlot = HeroMetaFact | false | null | undefined | '' | 0;

/**
 * The facts that survive their guards, in order.
 *
 * Exported because a hero has to know whether anything is left before it draws
 * the divider above the strip — see `HeroMetaSection`, which is the reason this
 * is a function and not an inline filter.
 */
export function resolveHeroFacts(facts: HeroMetaSlot[]): HeroMetaFact[] {
  return facts.filter(Boolean) as HeroMetaFact[];
}

/** Whether anything at all would show on a phone, where `secondary` facts are hidden. */
export function hasPrimaryHeroFacts(facts: HeroMetaSlot[]): boolean {
  return resolveHeroFacts(facts).some((fact) => !fact.secondary);
}

export type HeroMetaStripProps = {
  /**
   * The facts to show. Falsy entries are dropped rather than rendered as "—",
   * so callers can inline conditionals — `location && { … }` — without
   * filtering first. A hero that advertises what a record is *missing* is
   * noise, and the cards below it account for every field either way.
   */
  facts: HeroMetaSlot[];
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
  const items = resolveHeroFacts(facts);

  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap gap={{ xs: 1.5, sm: 3 }}>
      {items.map((fact, i) => (
        <HeroMetaItem key={i} icon={fact.icon} text={fact.text} secondary={fact.secondary} />
      ))}
    </Stack>
  );
}
