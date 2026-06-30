import NextLink from 'next/link';
import { Box, Paper, Grid, Stack, Typography, Button, Link } from '@sinnapi/ui';
import { Tune, Close } from '@sinnapi/ui/icons';
import FilterSelect from '@/components/molecules/filterSelect';
import type { EventsSearchParams } from '../../data/filterEvents';
import {
  EVENT_TYPE_OPTIONS,
  SOURCE_OPTIONS,
  LOCATION_OPTIONS,
  BUDGET_OPTIONS,
} from '../../data/options';

type EventsToolbarProps = {
  defaults: EventsSearchParams;
  resultCount: number;
  total: number;
  activeFilters: number;
};

/**
 * Refinement toolbar — a server-rendered GET form to `/events`, so it works
 * without client JS and keeps URLs shareable. The hero owns the free-text
 * search; this bar narrows by occasion, source, town and budget. The active
 * search term rides along in a hidden input so changing a facet refines rather
 * than clears it. Option/range data lives in the container's `data/` layer.
 */
export default function EventsToolbar({
  defaults,
  resultCount,
  total,
  activeFilters,
}: EventsToolbarProps) {
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
            Filter events
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {activeFilters > 0 ? (
              <>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {resultCount}
                </Box>{' '}
                of {total} events
              </>
            ) : (
              <>{total} events</>
            )}
          </Typography>
          {activeFilters > 0 && (
            <Link
              component={NextLink}
              href="/events"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontWeight: 600 }}
            >
              <Close sx={{ fontSize: 16 }} />
              Clear
            </Link>
          )}
        </Stack>
      </Stack>

      <Box component="form" action="/events" method="get">
        {defaults.q ? <input type="hidden" name="q" value={defaults.q} /> : null}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} md={3}>
            <FilterSelect
              name="type"
              label="Occasion"
              allLabel="All occasions"
              options={EVENT_TYPE_OPTIONS}
              defaultValue={defaults.type}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FilterSelect
              name="source"
              label="Type"
              allLabel="All types"
              options={SOURCE_OPTIONS}
              defaultValue={defaults.source}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FilterSelect
              name="location"
              label="Location"
              allLabel="All locations"
              options={LOCATION_OPTIONS}
              defaultValue={defaults.location}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FilterSelect
              name="budget"
              label="Budget"
              allLabel="Any budget"
              options={BUDGET_OPTIONS}
              defaultValue={defaults.budget}
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
