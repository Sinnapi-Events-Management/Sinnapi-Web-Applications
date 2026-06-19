import { Box, Paper, TextField, MenuItem, Button, Grid } from '@sinnapi/ui';
import { VENDOR_CATEGORIES, SERVICE_REGIONS, titleize } from '@/lib/config/site';

// Server-rendered GET form — works without client JS and is crawlable.
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
          <TextField
            name="category"
            label="Category"
            select
            defaultValue={defaults.category ?? ''}
            size="small"
          >
            <MenuItem value="">All categories</MenuItem>
            {VENDOR_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {titleize(c)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField
            name="region"
            label="Region"
            select
            defaultValue={defaults.region ?? ''}
            size="small"
          >
            <MenuItem value="">All regions</MenuItem>
            {SERVICE_REGIONS.map((r) => (
              <MenuItem key={r} value={r}>
                {titleize(r)}
              </MenuItem>
            ))}
          </TextField>
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
