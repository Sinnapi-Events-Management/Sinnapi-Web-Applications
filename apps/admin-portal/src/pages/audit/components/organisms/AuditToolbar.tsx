import {
  Box,
  Button,
  DateRangeField,
  FormControl,
  InputLabel,
  MenuItem,
  PAST_RANGE_PRESETS,
  Select,
  Stack,
} from '@sinnapi/ui';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import type { AuditFiltersApi, AuditFilterValues } from '../../hooks/useAuditFilters';
import {
  ACTOR_FILTER_OPTIONS,
  ENTITY_FILTER_OPTIONS,
  OPERATION_FILTER_OPTIONS,
  type FilterOption,
} from '../../schema/labels';

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

/**
 * Filter bar for the audit log: what happened (operation), which kind of record,
 * who did it (people vs system), and a date range. Presentational — all state
 * lives in `useAuditFilters`.
 */
export default function AuditToolbar({ filters }: { filters: AuditFiltersApi }) {
  const { values, set, range, setRange, reset, activeCount } = filters;
  const bind = (key: keyof AuditFilterValues) => (value: string) => set(key, value);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      flexWrap="wrap"
      useFlexGap
      alignItems="center"
      sx={{ mb: 2 }}
    >
      <SelectFilter
        label="Action"
        value={values.op}
        options={OPERATION_FILTER_OPTIONS}
        onChange={bind('op')}
      />
      <SelectFilter
        label="Record type"
        value={values.entity_type}
        options={ENTITY_FILTER_OPTIONS}
        onChange={bind('entity_type')}
      />
      <SelectFilter
        label="Performed by"
        value={values.actor}
        options={ACTOR_FILTER_OPTIONS}
        onChange={bind('actor')}
      />
      {/* One range, not two dates: an audit search is "what happened between
          these days", and the presets turn the common answers into one click. */}
      <DateRangeField
        label="Date range"
        size="small"
        fullWidth={false}
        value={range}
        onChange={setRange}
        presets={PAST_RANGE_PRESETS}
        disableFuture
        sx={{ minWidth: 230 }}
      />

      <Box sx={{ flex: 1 }} />

      {activeCount > 0 && (
        <Button
          size="small"
          color="inherit"
          startIcon={<FilterListOffIcon />}
          onClick={reset}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Clear filters ({activeCount})
        </Button>
      )}
    </Stack>
  );
}
