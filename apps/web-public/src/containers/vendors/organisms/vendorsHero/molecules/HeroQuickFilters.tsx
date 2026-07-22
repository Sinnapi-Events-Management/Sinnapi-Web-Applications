'use client';
import { Chip, Stack, Typography } from '@sinnapi/ui/atoms';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { useVendorsFilters } from '../../../hooks/useVendorsFilters';
import { RESULTS_ANCHOR_ID } from '../../../hooks/useVendorsSearchInput';
import { QUICK_FILTERS } from '../data/quickFilters';

/**
 * Popular-category shortcuts under the search pill.
 *
 * These were `<Link href="/vendors?category=…">`, which now costs a full
 * navigation for a filter every other control on the page applies in place, so
 * they set the facet directly instead — and scroll down to the results they
 * just produced, which a visitor at the top of the hero would otherwise never
 * see change.
 *
 * They stay chips with `aria-pressed` rather than becoming a second dropdown:
 * the toolbar already owns the exhaustive list, and these are one-tap entry
 * points into it. Tapping an active one clears it, so a shortcut is never a
 * one-way door.
 */
export default function HeroQuickFilters() {
  const { params, setFacet } = useVendorsFilters();

  const apply = (category: string) => {
    setFacet('category', params.category === category ? '' : category);
    document
      .getElementById(RESULTS_ANCHOR_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      {QUICK_FILTERS.map((quick) => {
        const isActive = params.category === quick.category;
        return (
          <Chip
            key={quick.category}
            label={quick.label}
            clickable
            size="small"
            aria-pressed={isActive}
            onClick={() => apply(quick.category)}
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
