'use client';
/**
 * `DateRangeField` bound to *two* react-hook-form fields.
 *
 * The forms that own a validity window — a discount, a promotion — store its
 * ends in two separate columns, and the schemas that validate them are written
 * per column. Rather than reshape those into a nested object just to satisfy the
 * control, this component keeps the two names and presents them as one range:
 * the form still sees `starts_at` and `ends_at`, the user still sees one field.
 *
 * The error shown is whichever end complains first, so a message like "End date
 * must be after the start date" surfaces on the control that produced it.
 */
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import {
  DateRangeField,
  type DateRangeFieldProps,
  type IsoDateRange,
} from '../molecules/datePicker';
import { useFieldError } from './useFieldError';

export type ControlledDateRangeFieldProps<T extends FieldValues> = Omit<
  DateRangeFieldProps,
  'value' | 'onChange' | 'onBlur' | 'error' | 'name'
> & {
  /** The field holding the start of the range. */
  fromName: FieldPath<T>;
  /** The field holding the end of the range. */
  toName: FieldPath<T>;
  control: Control<T>;
};

export function ControlledDateRangeField<T extends FieldValues>({
  fromName,
  toName,
  control,
  ...rest
}: ControlledDateRangeFieldProps<T>) {
  const from = useController({ name: fromName, control });
  const to = useController({ name: toName, control });
  // One binding for the pair: the range is one control, so a message from
  // either end is this control's message and either end being picked counts
  // as the user having engaged with it.
  const fromError = useFieldError(from.fieldState, from.formState);
  const toError = useFieldError(to.fieldState, to.formState);

  const value: IsoDateRange = {
    from: from.field.value ?? '',
    to: to.field.value ?? '',
  };

  const handleChange = (next: IsoDateRange) => {
    fromError.onEngage();
    toError.onEngage();
    from.field.onChange(next.from);
    to.field.onChange(next.to);
  };

  // Both ends are touched together: the range is picked as one gesture, so
  // marking only one of them would leave the other's rule silent.
  const handleBlur = () => {
    from.field.onBlur();
    to.field.onBlur();
  };

  return (
    <DateRangeField
      {...rest}
      name={fromName}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      error={fromError.error ?? toError.error}
    />
  );
}
