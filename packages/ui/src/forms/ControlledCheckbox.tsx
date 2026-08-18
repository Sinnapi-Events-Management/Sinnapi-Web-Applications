'use client';
import type { ReactNode } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, FormHelperText } from '../atoms';

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
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Box>
          <FormControlLabel
            sx={{ alignItems: 'flex-start', m: 0 }}
            control={
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
                disabled={disabled}
                sx={{ pt: 0.25 }}
              />
            }
            label={label}
          />
          {fieldState.error?.message && (
            <FormHelperText error sx={{ ml: 4 }}>
              {fieldState.error.message}
            </FormHelperText>
          )}
        </Box>
      )}
    />
  );
}
