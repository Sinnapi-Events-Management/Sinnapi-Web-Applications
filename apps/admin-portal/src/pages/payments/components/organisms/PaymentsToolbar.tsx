import {
  Box,
  Button,
  DateRangeField,
  FormControl,
  InputLabel,
  MenuItem,
  PAST_RANGE_PRESETS,
  SearchField,
  Select,
  Stack,
} from '@sinnapi/ui';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import type { SearchTerm } from '@/hooks/useSearchTerm';
import type { PaymentFilters } from '../../hooks/usePaymentFilters';
import { PROVIDER_OPTIONS, PURPOSE_OPTIONS, type FilterOption } from '../../schema';

type SelectFilterProps = {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

/** A labelled "Any …" dropdown bound to one filter key. */
function SelectFilter({ label, value, options, onChange }: SelectFilterProps) {
  return (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">
          <em>Any</em>
        </MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

type PaymentsToolbarProps = {
  search: SearchTerm;
  filters: PaymentFilters;
};

/**
 * Search + attribute filters for the Payments register. Presentational: it
 * renders the controls and delegates every change to the `search`/`filters`
 * hooks the page hook already owns. Wraps onto further rows on narrow screens.
 */
export default function PaymentsToolbar({ search, filters }: PaymentsToolbarProps) {
  const { values, setProvider, setPurpose, range, setRange, activeCount, reset } = filters;

  const showClear = activeCount > 0 || Boolean(search.input);
  const clearAll = () => {
    reset();
    search.clear();
  };

  return (
    <Stack
      direction="row"
      spacing={1.5}
      flexWrap="wrap"
      useFlexGap
      alignItems="center"
      sx={{ mb: 2 }}
    >
      <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 280 } }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Booking ref, payer, provider ref or payment ID…"
          ariaLabel="Search payments"
        />
      </Box>

      <SelectFilter
        label="Provider"
        value={values.provider}
        options={PROVIDER_OPTIONS}
        onChange={setProvider}
      />
      <SelectFilter
        label="Purpose"
        value={values.purpose}
        options={PURPOSE_OPTIONS}
        onChange={setPurpose}
      />
      {/* One range, not two dates: the question is "what came in between
          these days", and the presets turn the common answers into one click. */}
      <DateRangeField
        label="Created"
        size="small"
        fullWidth={false}
        value={range}
        onChange={setRange}
        presets={PAST_RANGE_PRESETS}
        disableFuture
        sx={{ minWidth: 230 }}
      />

      {showClear && (
        <Button
          size="small"
          color="inherit"
          startIcon={<FilterAltOffIcon />}
          onClick={clearAll}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Clear{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
      )}
    </Stack>
  );
}
