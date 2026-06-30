import { Box, Paper, TextField, Button, Grid } from '@sinnapi/ui';
import FilterSelect from '@/components/molecules/filterSelect';
import { CATEGORY_OPTIONS, REGION_OPTIONS } from './data/options';

/**
 * Server-rendered GET form — works without client JS and is crawlable.
 * Pure presentational Server Component; option data lives in ./data/options.
 */
export default function VendorFilterBar({
  defaults,
}: {
  defaults: { q?: string; category?: string; region?: string };
}) {
  return (
    <Paper variant="outlined" component="form" action="/vendors" method="get" sx={{ p: 2, mb: 4 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField name="q" label="Search vendors" defaultValue={defaults.q ?? ''} size="small" />
        </Grid>
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
        <Grid item xs={12} md={2}>
          <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
            <Button type="submit" variant="contained" fullWidth>
              Search
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
