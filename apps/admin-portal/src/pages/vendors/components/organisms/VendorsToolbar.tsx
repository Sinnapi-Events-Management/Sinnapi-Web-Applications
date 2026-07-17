import { Box, Stack, TextField, MenuItem, Switch, FormControlLabel, Button } from '@sinnapi/ui';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SearchField from '@/components/ui/SearchField';
import type { SearchTerm } from '@/hooks/useSearchTerm';
import type { VendorFilters } from '../../hooks/useVendorFilters';
import { VISIBILITY_OPTIONS, RATING_OPTIONS } from '../../schema/filters';

type VendorsToolbarProps = {
  search: SearchTerm;
  filters: VendorFilters;
};

/**
 * Search + attribute filters for the Vendors list. Presentational: it renders
 * the controls and delegates every change to the `search`/`filters` hooks the
 * page hook already owns. Collapses to a single column on narrow screens.
 */
export default function VendorsToolbar({ search, filters }: VendorsToolbarProps) {
  const { values, setVisibility, setMinRating, setFeatured, isActive, reset } = filters;

  const showClear = isActive || Boolean(search.input);
  const clearAll = () => {
    reset();
    search.clear();
  };

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ md: 'center' }}
      sx={{ mb: 2 }}
    >
      <Box sx={{ flex: 1, minWidth: { md: 240 } }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search by business or city…"
          ariaLabel="Search vendors"
        />
      </Box>

      <TextField
        select
        size="small"
        label="Visibility"
        value={values.visibility}
        onChange={(e) => setVisibility(e.target.value)}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="">Any</MenuItem>
        {VISIBILITY_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Rating"
        value={values.minRating}
        onChange={(e) => setMinRating(e.target.value)}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="">Any</MenuItem>
        {RATING_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <FormControlLabel
        control={
          <Switch checked={values.featured} onChange={(e) => setFeatured(e.target.checked)} />
        }
        label="Featured only"
        sx={{ whiteSpace: 'nowrap', mr: 0 }}
      />

      {showClear && (
        <Button
          size="small"
          color="inherit"
          startIcon={<FilterAltOffIcon />}
          onClick={clearAll}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );
}
