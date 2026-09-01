import NextLink from 'next/link';
import { Box, Chip, Stack, Typography } from '@sinnapi/ui/atoms';
import type { CategoryOption } from '@/lib/types';
import { offersHref, type OffersQuery } from '../../utils/searchParams';

type Props = {
  categories: CategoryOption[];
  query: OffersQuery;
};

/**
 * The category filter, as links.
 *
 * EVERY FILTER IS AN ANCHOR, NOT A CONTROL
 * That is the whole design of this page. A dropdown would be one URL with
 * hidden state; a row of links is one indexable URL per category, so
 * `/offers?category=photography` is a page a search engine can rank for
 * "photography offers" and a person can send to whoever they are planning
 * with. It also means the filter works before any JavaScript has loaded, which
 * on the connections this platform serves is most of the time a visitor is
 * looking at it.
 *
 * Chips rather than a list because the set is small and horizontal, and because
 * the selected one has to be visible at a glance — a filtered page that looks
 * unfiltered is a page whose empty results read as "there is nothing" rather
 * than "there is nothing in photography".
 *
 * Selecting a category returns to page one. Carrying `page=3` into a narrower
 * set lands the reader on an empty page they did not ask for, which
 * `offersHref` prevents by simply not being given one.
 */
export default function OffersFilters({ categories, query }: Props) {
  if (categories.length === 0) return null;

  return (
    <Box sx={{ mb: { xs: 3, md: 4 } }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
        Browse by category
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mt: 1 }}
        component="nav"
        aria-label="Filter offers by category"
      >
        <Chip
          component={NextLink}
          href={offersHref({ q: query.q })}
          clickable
          label="All"
          color={query.category ? 'default' : 'primary'}
          variant={query.category ? 'outlined' : 'filled'}
        />
        {categories.map((category) => {
          const selected = query.category === category.key;
          return (
            <Chip
              key={category.id}
              component={NextLink}
              href={offersHref({ q: query.q, category: category.key })}
              clickable
              label={category.name}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              // `aria-current` rather than relying on colour alone: the
              // selected chip has to be announced, not just seen.
              aria-current={selected ? 'page' : undefined}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
