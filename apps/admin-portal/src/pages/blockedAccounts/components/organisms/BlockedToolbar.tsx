import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@sinnapi/ui';
import SearchIcon from '@mui/icons-material/Search';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import { KIND_OPTIONS, ROLE_OPTIONS, type BlockedFiltersApi } from '../../hooks/useBlockedFilters';

type SelectFilterProps = {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
};

/** A labelled dropdown bound to one filter key. */
function SelectFilter({ label, value, options, onChange }: SelectFilterProps) {
  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <MenuItem key={opt.value || 'any'} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/**
 * Filter bar: free-text over name and email, plus the two dimensions that
 * actually partition this list — why the account is blocked, and what kind of
 * account it is.
 *
 * Presentational; all state lives in `useBlockedFilters`. Search is debounced
 * and URL-mirrored there, so a filtered view survives a refresh and can be sent
 * to a colleague.
 */
export default function BlockedToolbar({ filters }: { filters: BlockedFiltersApi }) {
  const { kind, role, setKind, setRole, search, reset, activeCount } = filters;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      flexWrap="wrap"
      useFlexGap
      alignItems="center"
      sx={{ mb: 2 }}
    >
      <TextField
        size="small"
        label="Search name or email"
        value={search.input}
        onChange={(e) => search.setInput(e.target.value)}
        sx={{ minWidth: 260 }}
        InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} /> }}
      />

      <SelectFilter label="Block type" value={kind} options={KIND_OPTIONS} onChange={setKind} />
      <SelectFilter label="Account type" value={role} options={ROLE_OPTIONS} onChange={setRole} />

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
