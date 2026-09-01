'use client';
import type { ReactNode } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, FormHelperText } from '../atoms';
import { useFieldError } from './useFieldError';

export type ControlledCheckboxProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  /** Rich label — consent copy usually carries links, so this is a node. */
  label: ReactNode;
  disabled?: boolean;
};

/**
 * A checkbox bound to react-hook-form.
 *
 * Exists mainly for consent: an acceptance checkbox has to be able to show a
 * validation message of its own (a form that refuses to submit with no visible
 * reason is the worst version of a required terms box), and MUI's
 * `FormControlLabel` has no error affordance. Top-aligned because consent copy
 * routinely wraps to three lines and a vertically-centred box beside a
 * paragraph reads as unrelated to it.
 */
export function ControlledCheckbox<T extends FieldValues>({
  name,
  control,
  label,
  disabled,
}: ControlledCheckboxProps<T>) {
  const { field, fieldState, formState } = useController({ name, control });
  const { error, onEngage } = useFieldError(fieldState, formState);

  return (
    <Box>
      <FormControlLabel
        sx={{ alignItems: 'flex-start', m: 0 }}
        control={
          <Checkbox
            checked={Boolean(field.value)}
            onChange={(e) => {
              onEngage();
              field.onChange(e.target.checked);
            }}
            onBlur={field.onBlur}
            disabled={disabled}
            sx={{ pt: 0.25 }}
          />
        }
        label={label}
      />
      {error && (
        <FormHelperText error sx={{ ml: 4 }}>
          {error}
        </FormHelperText>
      )}
    </Box>
  );
}
