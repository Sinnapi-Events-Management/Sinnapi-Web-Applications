import { Box, Paper, TextField, Button } from '@sinnapi/ui';
import { Search } from '@sinnapi/ui/icons';
import type { EventsSearchParams } from '../../../data/filterEvents';

/** Facet keys carried through the hero search so an active filter survives a new search. */
const CARRIED: (keyof EventsSearchParams)[] = ['type', 'source', 'location', 'budget'];

/**
 * Prominent hero search — a plain GET form to `/events`, so search works without
 * client JS and stays crawlable (mirrors the vendors discovery pattern). Renders
 * as a solid white pill over the teal hero so it reads as the primary action.
 * Any active facet is preserved via hidden inputs so searching refines rather
 * than resets the current view.
 */
export default function HeroSearchForm({ defaults }: { defaults: EventsSearchParams }) {
  return (
    <Paper
      component="form"
      action="/events"
      method="get"
      role="search"
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 0.75,
        pl: { xs: 1.5, sm: 2 },
        mx: { xs: 0, md: 'auto' },
        maxWidth: 560,
        borderRadius: 999,
        boxShadow: '0 18px 40px -18px rgba(4, 46, 44, 0.55)',
      }}
    >
      {CARRIED.map((key) =>
        defaults[key] ? <input key={key} type="hidden" name={key} value={defaults[key]} /> : null,
      )}

      <Search sx={{ color: 'text.disabled' }} />
      <TextField
        name="q"
        variant="standard"
        fullWidth
        defaultValue={defaults.q ?? ''}
        placeholder="Search events, types, or towns…"
        InputProps={{ disableUnderline: true }}
        inputProps={{ 'aria-label': 'Search events' }}
        sx={{ '& .MuiInputBase-input': { py: 1, fontSize: '1rem' } }}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        sx={{ borderRadius: 999, flexShrink: 0, px: { xs: 2.5, sm: 3.5 } }}
      >
        Search
      </Button>
    </Paper>
  );
}
