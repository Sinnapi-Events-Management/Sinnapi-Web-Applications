import { InputAdornment, TextField, IconButton } from '@sinnapi/ui';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

type SearchFieldProps = {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
  placeholder?: string;
  /** Accessible label for the input. */
  ariaLabel?: string;
};

/**
 * Presentational debounced-search input: a leading search icon and a trailing
 * clear button that appears once there's text. State (including debounce) is
 * owned by the caller's hook, so this stays reusable across admin lists.
 *
 * Sizing is deliberately the caller's job: this fills whatever box it's given
 * and never holds a width floor of its own. An intrinsic minimum here would
 * overflow any parent narrower than it — a flex sibling, a master–detail
 * column — and paint over the control beside it. Callers that want a floor or
 * a cap put it on the wrapper, where the rest of the row's layout already is.
 */
export default function SearchField({
  value,
  onChange,
  onClear,
  placeholder = 'Search…',
  ariaLabel = 'Search',
}: SearchFieldProps) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="small"
      fullWidth
      inputProps={{ 'aria-label': ariaLabel }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" color="action" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" edge="end" aria-label="Clear search" onClick={onClear}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      // minWidth: 0 so the input can shrink below its intrinsic size inside a
      // flex parent instead of overflowing it.
      sx={{ width: '100%', minWidth: 0 }}
    />
  );
}
