import NextLink from 'next/link';
import { Box, Paper, Grid, Stack, Typography, Button, Link } from '@sinnapi/ui';
import { Tune, Close } from '@sinnapi/ui/icons';
import FilterSelect from '@/components/molecules/filterSelect';
import type { VendorsSearchParams } from '../../utils/filterVendors';
import {
  CATEGORY_OPTIONS,
  REGION_OPTIONS,
  PRICE_OPTIONS,
  RATING_OPTIONS,
} from '../../utils/options';

type VendorsToolbarProps = {
  defaults: VendorsSearchParams;
  resultCount: number;
  total: number;
  activeFilters: number;
};

/**
 * Refinement toolbar — a server-rendered GET form to `/vendors`, so it works
 * without client JS and keeps URLs shareable. The hero owns the free-text
 * search; this bar narrows by category, region, price band and minimum rating.
 * The active search term rides along in a hidden input so changing a facet
 * refines rather than clears it. Option/range data lives in the container's
 * `data/` layer.
 */
export default function VendorsToolbar({
  defaults,
  resultCount,
  total,
  activeFilters,
}: VendorsToolbarProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: { xs: 3, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Tune fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>
            Filter vendors
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {activeFilters > 0 ? (
              <>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {resultCount}
                </Box>{' '}
                of {total} vendors
              </>
            ) : (
              <>{total} vendors</>
            )}
          </Typography>
          {activeFilters > 0 && (
            <Link
              component={NextLink}
              href="/vendors"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontWeight: 600 }}
            >
              <Close sx={{ fontSize: 16 }} />
              Clear
            </Link>
          )}
        </Stack>
      </Stack>

      <Box component="form" action="/vendors" method="get">
        {defaults.q ? <input type="hidden" name="q" value={defaults.q} /> : null}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} md={3}>
            <FilterSelect
              name="category"
              label="Category"
              allLabel="All categories"
              options={CATEGORY_OPTIONS}
              defaultValue={defaults.category}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FilterSelect
              name="region"
              label="Region"
              allLabel="All regions"
              options={REGION_OPTIONS}
              defaultValue={defaults.region}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FilterSelect
              name="price"
              label="Price"
              allLabel="Any price"
              options={PRICE_OPTIONS}
              defaultValue={defaults.price}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FilterSelect
              name="rating"
              label="Rating"
              allLabel="Any rating"
              options={RATING_OPTIONS}
              defaultValue={defaults.rating}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button type="submit" variant="contained" fullWidth>
              Apply
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
