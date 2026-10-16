'use client';
import { Paper, TextField, IconButton } from '@sinnapi/ui/atoms';
import { Search, Close } from '@mui/icons-material';
import { useVendorsSearchInput } from '../../../hooks/useVendorsSearchInput';

/**
 * Search bar for the vendors toolbar — moved from the hero to the toolbar area.
 *
 * This provides the same live search functionality as the hero's search pill,
 * but in a more compact form that fits within the toolbar. The search triggers
 * real-time filtering of the vendor grid as the user types (debounced).
 */
export default function ToolbarSearch() {
  const { value, setValue, submit, clear, clearsFilters } = useVendorsSearchInput();

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
        p: 0.5,
        pl: 1,
        mb: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
      <TextField
        name="q"
        variant="standard"
        fullWidth
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search vendors, services, or towns…"
        InputProps={{ disableUnderline: true }}
        inputProps={{ 'aria-label': 'Search vendors', enterKeyHint: 'search' }}
        sx={{
          '& .MuiInputBase-input': { py: 1, fontSize: '0.95rem' },
          mx: 1,
        }}
      />
      {value && (
        <IconButton
          aria-label={clearsFilters ? 'Clear search and filters' : 'Clear search'}
          title={clearsFilters ? 'Clear search and filters' : 'Clear search'}
          size="small"
          onClick={clear}
          sx={{ mr: 0.5 }}
        >
          <Close fontSize="small" />
        </IconButton>
      )}
    </Paper>
  );
}
