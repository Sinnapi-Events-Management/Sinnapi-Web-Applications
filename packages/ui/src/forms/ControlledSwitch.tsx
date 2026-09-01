'use client';
import type { ReactNode } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Box, FormControlLabel, FormHelperText, Switch, Typography } from '../atoms';
import { useFieldError } from './useFieldError';

export type ControlledSwitchProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: ReactNode;
  /** What turning it on actually does. Sits under the label, not in a tooltip. */
  helperText?: ReactNode;
  disabled?: boolean;
};

/**
 * A switch bound to react-hook-form.
 *
 * The sibling of `ControlledCheckbox`, and the distinction between them is not
 * cosmetic: a checkbox states a fact ("I accept these terms") and a switch
 * changes a setting that takes effect ("apply this automatically"). Using a
 * checkbox for the second reads as something the vendor is agreeing to rather
 * than something they are turning on.
 *
 * The helper text sits under the label rather than in a tooltip, because a
 * setting whose consequence is only discoverable on hover is a setting nobody
 * discovers on a phone.
 */
export function ControlledSwitch<T extends FieldValues>({
  name,
  control,
  label,
  helperText,
  disabled,
}: ControlledSwitchProps<T>) {
  const { field, fieldState, formState } = useController({ name, control });
  const { error, onEngage } = useFieldError(fieldState, formState);

  return (
    <Box>
      <FormControlLabel
        sx={{ m: 0, alignItems: 'center' }}
        control={
          <Switch
            checked={Boolean(field.value)}
            onChange={(e) => {
              onEngage();
              field.onChange(e.target.checked);
            }}
            onBlur={field.onBlur}
            disabled={disabled}
          />
        }
        label={
          typeof label === 'string' ? (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
          ) : (
            label
          )
        }
      />
      {(helperText || error) && (
        // Indented to clear the switch, so the sentence reads as belonging to
        // the label above it rather than to the field below.
        <FormHelperText error={Boolean(error)} sx={{ ml: 7, mt: 0 }}>
          {error ?? helperText}
        </FormHelperText>
      )}
    </Box>
  );
}
