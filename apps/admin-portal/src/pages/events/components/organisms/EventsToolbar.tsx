import { Box, Stack, TextField, MenuItem, Button, Typography } from '@sinnapi/ui';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SearchField from '@/components/ui/SearchField';
import type { SearchTerm } from '@/hooks/useSearchTerm';
import type { EventFilters } from '../../hooks/useEventFilters';
import { SOURCE_OPTIONS, PUBLIC_OPTIONS } from '../../schema';

type EventsToolbarProps = {
  search: SearchTerm;
  filters: EventFilters;
};

/**
 * Search + attribute filters for the Events list. Everything sits on a single
 * row on desktop — the search grows to fill, the filters keep fixed widths so
 * they don't stretch — and collapses to a stacked column on narrow screens.
 * Presentational: every change is delegated to the `search`/`filters` hooks the
 * page hook already owns.
 */
export default function EventsToolbar({ search, filters }: EventsToolbarProps) {
  const { values, setSource, setPublic, setDateFrom, setDateTo, isActive, reset } = filters;

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
      {/* Grows to absorb the leftover width; minWidth 0 lets it shrink politely. */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search by title or location…"
          ariaLabel="Search events"
        />
      </Box>

      <TextField
        select
        size="small"
        label="Source"
        value={values.source}
        onChange={(e) => setSource(e.target.value)}
        sx={{ width: { xs: '100%', md: 148 }, flexShrink: 0 }}
      >
        <MenuItem value="">Any source</MenuItem>
        {SOURCE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Visibility"
        value={values.isPublic}
        onChange={(e) => setPublic(e.target.value)}
        sx={{ width: { xs: '100%', md: 148 }, flexShrink: 0 }}
      >
        <MenuItem value="">Any visibility</MenuItem>
        {PUBLIC_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {/* Date range kept as one labelled unit so the row reads as four controls,
          not two orphaned date pickers. */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}
      >
        <TextField
          type="date"
          size="small"
          label="From"
          value={values.dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', md: 150 } }}
        />
        <Typography component="span" color="text.disabled" sx={{ px: 0.25 }}>
          –
        </Typography>
        <TextField
          type="date"
          size="small"
          label="To"
          value={values.dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', md: 150 } }}
        />
      </Stack>

      {showClear && (
        <Button
          size="small"
          color="inherit"
          startIcon={<FilterAltOffIcon />}
          onClick={clearAll}
          sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );
}
