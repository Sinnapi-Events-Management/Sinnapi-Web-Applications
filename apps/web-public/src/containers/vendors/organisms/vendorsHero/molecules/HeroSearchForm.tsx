import { Paper, TextField, Button } from '@sinnapi/ui/atoms';
import { Search } from '@mui/icons-material';
import type { VendorsSearchParams } from '../../../utils/filterVendors';

/** Facet keys carried through the hero search so an active filter survives a new search. */
const CARRIED: (keyof VendorsSearchParams)[] = ['category', 'region', 'price', 'rating'];

/**
 * Prominent hero search — a plain GET form to `/vendors`, so search works
 * without client JS and stays crawlable (mirrors the events discovery pattern).
 * Renders as a solid white pill over the teal hero so it reads as the primary
 * action. Any active facet is preserved via hidden inputs so searching refines
 * rather than resets the current view.
 */
export default function HeroSearchForm({ defaults }: { defaults: VendorsSearchParams }) {
  return (
    <Paper
      component="form"
      action="/vendors"
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
        placeholder="Search vendors, services, or towns…"
        InputProps={{ disableUnderline: true }}
        inputProps={{ 'aria-label': 'Search vendors' }}
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
