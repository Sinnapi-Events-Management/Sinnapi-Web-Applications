'use client';
import { Box, IconButton } from '@sinnapi/ui/atoms';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import GridView from '@mui/icons-material/GridView';
import type { CategoryOption, VendorFacetCounts } from '@/lib/types';
import { useVendorsFilters } from '../../hooks/useVendorsFilters';
import { iconForCategory } from '../../data/categoryIcons';
import { useCategoryRail } from './hooks/useCategoryRail';
import CategoryTile from './molecules/CategoryTile';

type VendorsCategoryRailProps = {
  categories: CategoryOption[];
  facetCounts?: VendorFacetCounts;
};

const FADE =
  'linear-gradient(to right, transparent, #000 32px, #000 calc(100% - 32px), transparent)';

/**
 * Browse-by-category row: an "All" tile then one icon tile per category, in a
 * single swipeable line. Replaces the Category dropdown — with 58 categories a
 * select is a scroll-and-squint list, whereas a row of recognisable icons is
 * scannable and one tap.
 *
 * Writes the same `category` facet the dropdown did, through the same hook, so
 * counts, URLs, chips, prefetch and the hero shortcuts keep working untouched.
 * Tapping the active tile clears it (a selection is never a one-way door).
 *
 * Mobile: native momentum scrolling with snap, hidden scrollbar, edge fades as
 * the "more this way" cue. Desktop: the same row plus arrow buttons that appear
 * only when there is something to scroll to.
 */
export default function VendorsCategoryRail({ categories, facetCounts }: VendorsCategoryRailProps) {
  const { params, setFacet } = useVendorsFilters();
  const { railRef, edges, measure, scrollByPage } = useCategoryRail(params.category);

  if (categories.length === 0) return null;

  const counts = facetCounts?.category;
  const select = (key: string) => setFacet('category', params.category === key ? '' : key);

  return (
    <Box
      component="nav"
      aria-label="Browse vendors by category"
      sx={{ position: 'relative', mt: { xs: 2, md: 3 }, mx: { xs: -2, sm: 0 } }}
    >
      <Box
        ref={railRef}
        onScroll={measure}
        role="group"
        sx={{
          display: 'flex',
          gap: { xs: 0.25, md: 0.5 },
          overflowX: 'auto',
          px: { xs: 2, sm: 0 },
          scrollSnapType: 'x proximity',
          overscrollBehaviorX: 'contain',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          WebkitMaskImage: edges.start || edges.end ? FADE : 'none',
          maskImage: edges.start || edges.end ? FADE : 'none',
        }}
      >
        <CategoryTile
          label="All"
          icon={GridView}
          active={!params.category}
          onClick={() => setFacet('category', '')}
        />
        {categories.map((category) => {
          const active = params.category === category.key;
          const count = counts ? (counts[category.key] ?? 0) : undefined;
          return (
            <CategoryTile
              key={category.key}
              label={category.name}
              icon={iconForCategory(category.name)}
              active={active}
              count={count}
              disabled={count === 0 && !active}
              onClick={() => select(category.key)}
            />
          );
        })}
      </Box>

      {(['start', 'end'] as const).map((side) =>
        edges[side] ? (
          <IconButton
            key={side}
            size="small"
            aria-label={side === 'start' ? 'Scroll categories left' : 'Scroll categories right'}
            onClick={() => scrollByPage(side === 'start' ? -1 : 1)}
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              position: 'absolute',
              top: 24,
              [side === 'start' ? 'left' : 'right']: -12,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 1,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            {side === 'start' ? (
              <ChevronLeft fontSize="small" />
            ) : (
              <ChevronRight fontSize="small" />
            )}
          </IconButton>
        ) : null,
      )}
    </Box>
  );
}
