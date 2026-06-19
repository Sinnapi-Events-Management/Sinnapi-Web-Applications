'use client';
import { forwardRef } from 'react';
import { TextField, type TextFieldProps, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Close';

export type SearchFieldProps = Omit<TextFieldProps, 'type'> & {
  /** Called when the clear (x) button is pressed. When provided, the button shows. */
  onClear?: () => void;
};

/** Text input with a leading search icon and an optional clear button. */
export const SearchField = forwardRef<HTMLDivElement, SearchFieldProps>(function SearchField(
  { onClear, value, InputProps, placeholder = 'Search…', ...rest },
  ref,
) {
  const showClear = Boolean(onClear) && Boolean(value);
  return (
    <TextField
      ref={ref}
      type="search"
      value={value}
      placeholder={placeholder}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: showClear ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="clear search" onClick={onClear} edge="end">
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
        ...InputProps,
      }}
      {...rest}
    />
  );
});
