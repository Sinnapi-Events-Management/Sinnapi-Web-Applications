import { Box, Button, MenuItem, Stack, TextField } from '@sinnapi/ui';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SearchField from '@/components/ui/SearchField';
import type { CategoryFiltersState } from '../../hooks/useServiceCategories';

type Props = {
  filters: CategoryFiltersState;
};

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

/**
 * Catalogue filters. Presentational: it renders the controls and delegates
 * every change to the `filters` state the page hook owns. The create entry
 * point lives in the page header (see ServiceCategories).
 */
export default function CategoriesToolbar({ filters }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ md: 'center' }}
      sx={{ mb: 2 }}
    >
      <Box sx={{ flex: 1, minWidth: { md: 240 } }}>
        <SearchField
          value={filters.search.input}
          onChange={filters.search.setInput}
          onClear={filters.search.clear}
          placeholder="Search by name or key…"
          ariaLabel="Search categories"
        />
      </Box>

      <TextField
        select
        size="small"
        label="Status"
        value={filters.active}
        onChange={(e) => filters.setActive(e.target.value)}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="">Any</MenuItem>
        {STATUS_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      {filters.isActive && (
        <Button
          size="small"
          color="inherit"
          startIcon={<FilterAltOffIcon />}
          onClick={filters.reset}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );
}
