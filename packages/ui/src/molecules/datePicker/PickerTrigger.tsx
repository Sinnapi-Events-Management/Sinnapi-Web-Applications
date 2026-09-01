'use client';
/**
 * The field a picker looks like when it is closed.
 *
 * It is a real `TextField` rather than a button so a date sits in a form row
 * looking exactly like the text and select fields above and below it — same
 * outline, same label behaviour, same error and helper text. The input is
 * read-only: the value is always a formatted string produced by the picker, so
 * letting someone type into it would only create states the calendar can't
 * represent.
 */
import { forwardRef, type KeyboardEvent, type ReactNode } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import ClearIcon from '@mui/icons-material/Close';
import type { PickerFieldProps } from './types';

export type PickerTriggerProps = Omit<PickerFieldProps, 'onBlur'> & {
  /** The formatted value, e.g. `12 Aug 2026`. Empty shows the placeholder. */
  display: string;
  open: boolean;
  onOpen: () => void;
  onClear: () => void;
  /** Leading icon — a calendar for dates, a clock for times. */
  icon: ReactNode;
  /** Announced label for the clear button, e.g. "Clear event date". */
  clearLabel?: string;
};

/** Keys that should open a closed picker, matching the ARIA combobox pattern. */
const OPEN_KEYS = ['Enter', ' ', 'ArrowDown'];

export const PickerTrigger = forwardRef<HTMLDivElement, PickerTriggerProps>(function PickerTrigger(
  {
    display,
    open,
    onOpen,
    onClear,
    icon,
    clearLabel = 'Clear',
    label,
    placeholder,
    helperText,
    error,
    required,
    disabled,
    // NOT defaulted. It used to be `'medium'`, which quietly beat the portal
    // theme's `MuiTextField: { defaultProps: { size: 'small' } }` — so every
    // date and time picker in all three portals stood 56px tall in a column of
    // 40px fields. Alone in a form that reads as generous spacing; the moment
    // one sits beside a select it reads as broken. Left undefined so the field
    // takes whatever size the surrounding theme gives every other field.
    size,
    fullWidth = true,
    clearable = true,
    name,
    id,
    autoFocus,
    sx,
  },
  ref,
) {
  const hasError = Boolean(error);
  const message = typeof error === 'string' ? error : helperText;
  const showClear = clearable && Boolean(display) && !disabled;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!OPEN_KEYS.includes(event.key)) return;
    // Space would scroll the page and Enter would submit the surrounding form.
    event.preventDefault();
    onOpen();
  };

  return (
    <TextField
      ref={ref}
      id={id}
      name={name}
      label={label}
      value={display}
      placeholder={placeholder}
      error={hasError}
      helperText={message}
      required={required}
      disabled={disabled}
      size={size}
      fullWidth={fullWidth}
      autoFocus={autoFocus}
      onClick={disabled ? undefined : onOpen}
      onKeyDown={handleKeyDown}
      // Always shrunk: the value is a formatted string that never matches the
      // label's resting position, and the placeholder must stay readable.
      InputLabelProps={{ shrink: true }}
      inputProps={{
        readOnly: true,
        role: 'combobox',
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        // Read-only inputs are still tabbable; the caret is what we suppress.
        style: { cursor: disabled ? 'default' : 'pointer', caretColor: 'transparent' },
      }}
      InputProps={{
        startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
        endAdornment: showClear ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              edge="end"
              aria-label={clearLabel}
              // Without this the click bubbles to the field and reopens the picker.
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
        sx: { cursor: disabled ? 'default' : 'pointer' },
      }}
      sx={sx}
    />
  );
});
