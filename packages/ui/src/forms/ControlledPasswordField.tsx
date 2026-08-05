'use client';
import { useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import { IconButton, InputAdornment } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { ControlledField, type ControlledFieldProps } from './ControlledField';

export type ControlledPasswordFieldProps<T extends FieldValues> = Omit<
  ControlledFieldProps<T>,
  'type' | 'options'
> & {
  /** Hides the show/hide toggle — for sign-in, where revealing adds little. */
  hideToggle?: boolean;
};

/**
 * A password `ControlledField` with a show/hide toggle.
 *
 * Every password input in the portals is this component, so the reveal
 * affordance, its accessible label and the error styling stay identical across
 * sign-up, reset and forced-change — three flows that previously each rebuilt
 * the adornment by hand.
 */
export function ControlledPasswordField<T extends FieldValues>({
  hideToggle = false,
  InputProps,
  ...rest
}: ControlledPasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false);

  return (
    <ControlledField
      {...rest}
      type={visible ? 'text' : 'password'}
      InputProps={{
        ...InputProps,
        endAdornment: hideToggle ? (
          InputProps?.endAdornment
        ) : (
          <InputAdornment position="end">
            <IconButton
              aria-label={visible ? 'Hide password' : 'Show password'}
              onClick={() => setVisible((v) => !v)}
              edge="end"
              size="small"
            >
              {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
