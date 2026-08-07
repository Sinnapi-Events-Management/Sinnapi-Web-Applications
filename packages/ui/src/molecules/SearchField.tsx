'use client';
import { forwardRef } from 'react';
import {
  TextField,
  type TextFieldProps,
  type SxProps,
  type Theme,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

export type SearchFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  /** Current field text. Controlled — the caller's hook owns it (including debounce). */
  value: string;
  /** Receives the next text directly, so callers never unwrap the event themselves. */
  onChange: (next: string) => void;
  /** Called by the trailing clear button. Omit it and no clear button renders. */
  onClear?: () => void;
  /** Accessible label for the input. Also labels the clear button ("Clear {ariaLabel}"). */
  ariaLabel?: string;
  /** Drop the leading magnifier — for compact rows where the label already says "search". */
  hideSearchIcon?: boolean;
};

/**
 * The search input every Sinnapi app uses: a leading search icon and a trailing
 * clear button that appears once there's text.
 *
 * Presentational by design — state, debounce and URL mirroring belong to the
 * caller's hook, which is what lets one component serve an admin table toolbar,
 * a client-portal discovery grid and a vendor-portal feed without any of them
 * agreeing on how the term is stored.
 *
 * Sizing is deliberately the caller's job: this fills whatever box it's given
 * and never holds a width floor of its own. An intrinsic minimum here would
 * overflow any parent narrower than it — a flex sibling, a master–detail
 * column — and paint over the control beside it. Callers that want a floor or
 * a cap put it on the wrapper, where the rest of the row's layout already is.
 *
 * Every other `TextField` prop passes through (`size`, `variant`, `label`,
 * `disabled`, `sx`…), so a caller can restyle it without forking the clear
 * behaviour — the one part that must not drift between apps.
 */
export const SearchField = forwardRef<HTMLDivElement, SearchFieldProps>(function SearchField(
  {
    value,
    onChange,
    onClear,
    placeholder = 'Search…',
    ariaLabel = 'Search',
    hideSearchIcon = false,
    size = 'small',
    fullWidth = true,
    InputProps,
    inputProps,
    sx,
    ...rest
  },
  ref,
) {
  const showClear = Boolean(onClear) && value.length > 0;

  return (
    <TextField
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      inputProps={{ 'aria-label': ariaLabel, ...inputProps }}
      InputProps={{
        startAdornment: hideSearchIcon ? undefined : (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" color="action" />
          </InputAdornment>
        ),
        endAdornment: showClear ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              edge="end"
              aria-label={`Clear ${ariaLabel.toLowerCase()}`}
              onClick={onClear}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
        ...InputProps,
      }}
      // minWidth: 0 so the input can shrink below its intrinsic size inside a
      // flex parent instead of overflowing it. Caller `sx` is appended, not
      // merged, so it wins on any property it sets.
      sx={[{ width: '100%', minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
      {...rest}
    />
  );
});
