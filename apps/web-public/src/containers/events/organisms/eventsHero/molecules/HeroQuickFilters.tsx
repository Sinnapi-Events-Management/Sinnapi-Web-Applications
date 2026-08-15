'use client';
import { Chip, Stack, Typography } from '@sinnapi/ui/atoms';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import type { FilterOption } from '@/lib/types';
import { useEventsFilters } from '../../../hooks/useEventsFilters';
import { RESULTS_ANCHOR_ID } from '../../../hooks/useEventsSearchInput';

/**
 * How many occasions get a shortcut. The row is a fast path, not a second copy
 * of the dropdown, so it stops well short of the full vocabulary.
 */
const QUICK_FILTER_COUNT = 5;

/**
 * Popular-occasion shortcuts under the search pill.
 *
 * These were `<Link href="/events?type=…">`, which now costs a full navigation
 * for a filter every other control on the page applies in place, so they set the
 * facet directly instead — and scroll down to the results they just produced,
 * which a visitor at the top of the hero would otherwise never see change.
 *
 * They stay chips with `aria-pressed` rather than becoming a second dropdown:
 * the toolbar already owns the exhaustive list, and these are one-tap entry
 * points into it. Tapping an active one clears it, so a shortcut is never a
 * one-way door.
 *
 * Which occasions appear is the admin's `sort_order` rather than a hand-picked
 * list. The hardcoded one had gone stale — "Corporate" and "Concerts" were
 * tokens no event has ever carried, so those two chips filtered the grid down
 * to nothing every single time they were tapped.
 */
export default function HeroQuickFilters({ typeOptions }: { typeOptions: FilterOption[] }) {
  const { params, setFacet } = useEventsFilters(typeOptions);

  const apply = (type: string) => {
    setFacet('type', params.type === type ? '' : type);
    document
      .getElementById(RESULTS_ANCHOR_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // No occasions configured (or the reference read failed): drop the row rather
  // than leave a "Popular:" label standing on its own.
  if (typeOptions.length === 0) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      sx={{ mt: 3, justifyContent: { md: 'center' } }}
    >
      <Typography variant="body2" sx={{ color: withAlpha(common.white, 0.7), mr: 0.5, py: 0.5 }}>
        Popular:
      </Typography>
      {typeOptions.slice(0, QUICK_FILTER_COUNT).map((quick) => {
        const isActive = params.type === quick.value;
        return (
          <Chip
            key={quick.value}
            label={quick.label}
            clickable
            size="small"
            aria-pressed={isActive}
            onClick={() => apply(quick.value)}
            sx={{
              color: 'common.white',
              bgcolor: withAlpha(common.white, isActive ? 0.3 : 0.12),
              border: '1px solid',
              borderColor: withAlpha(common.white, isActive ? 0.65 : 0.28),
              fontWeight: 600,
              transition: 'background-color .2s ease, border-color .2s ease',
              '&:hover': { bgcolor: withAlpha(common.white, isActive ? 0.36 : 0.22) },
            }}
          />
        );
      })}
    </Stack>
  );
}
