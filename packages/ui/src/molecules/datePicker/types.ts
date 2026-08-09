/**
 * The prop vocabulary shared by every picker field.
 *
 * Kept in one place so `DateField`, `DateRangeField` and `TimeField` present the
 * same surface as the `FormField`/`TextField` they replace — a call site that
 * swaps one for the other should not have to relearn `error`, `size` or
 * `helperText`.
 */
import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material';
import type { IsoDate } from './isoDate';

/** Everything a picker inherits from being a form field first and a calendar second. */
export type PickerFieldProps = {
  label?: string;
  /** Shown when nothing is chosen. Defaults per field (e.g. "Select date"). */
  placeholder?: string;
  helperText?: ReactNode;
  /** A string renders as the message *and* puts the field in its error state. */
  error?: string | boolean | null;
  required?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  /** Shows the inline clear button once a value is present. Default `true`. */
  clearable?: boolean;
  name?: string;
  id?: string;
  autoFocus?: boolean;
  /** Fires when the picker closes — the moment validation should run. */
  onBlur?: () => void;
  sx?: SxProps<Theme>;
};

/** What a calendar is allowed to offer. Every bound is inclusive. */
export type DateBoundsProps = {
  minDate?: IsoDate;
  maxDate?: IsoDate;
  /** Blocks every day before today. Combines with `minDate` (the later wins). */
  disablePast?: boolean;
  /** Blocks every day after today. Combines with `maxDate` (the earlier wins). */
  disableFuture?: boolean;
  /** Individual days that cannot be chosen — e.g. dates already blocked. */
  disabledDates?: IsoDate[];
};

/**
 * Day markers drawn under the date number, keyed by modifier name. `blocked`
 * (red dot) and `booked` (gold dot) are styled by the design system; any other
 * key is passed through for the caller to style.
 */
export type DayModifiers = Record<string, IsoDate[]>;
