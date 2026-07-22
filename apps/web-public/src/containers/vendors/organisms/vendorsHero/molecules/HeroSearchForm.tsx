'use client';
import { Paper, TextField, Button, IconButton } from '@sinnapi/ui/atoms';
import { Search, Close } from '@mui/icons-material';
import { useVendorsSearchInput } from '../../../hooks/useVendorsSearchInput';

/**
 * The hero's search pill — the page's primary action, and now a live one: the
 * grid below re-queries as the visitor types (debounced), instead of waiting
 * for a submit that reloads the whole page.
 *
 * It stays a real `<form>` with a real submit button rather than a bare input.
 * Enter has to work, mobile keyboards need a search action key to show, and
 * `role="search"` is what lets assistive tech jump straight here — none of
 * which a div with an onChange gives you. Submit's own job is small: flush the
 * pending debounce and scroll the results into view, since on a hero this tall
 * the grid the visitor just asked for is off screen.
 */
export default function HeroSearchForm() {
  const { value, setValue, submit, clear } = useVendorsSearchInput();

  return (
    <Paper
      component="form"
      role="search"
      elevation={0}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
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
      <Search sx={{ color: 'text.disabled' }} />
      <TextField
        name="q"
        variant="standard"
        fullWidth
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search vendors, services, or towns…"
        InputProps={{ disableUnderline: true }}
        inputProps={{ 'aria-label': 'Search vendors', enterKeyHint: 'search' }}
        sx={{ '& .MuiInputBase-input': { py: 1, fontSize: '1rem' } }}
      />
      {value && (
        <IconButton aria-label="Clear search" size="small" onClick={clear}>
          <Close fontSize="small" />
        </IconButton>
      )}
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
