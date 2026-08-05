import { useState } from 'react';
import { TextField, IconButton, InputAdornment } from '@sinnapi/ui';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

type Props = {
  name?: string;
  label?: string;
  autoComplete?: string;
};

/**
 * An uncontrolled password input with a reveal toggle.
 *
 * The console's forms are read through `FormData` rather than react-hook-form,
 * so this deliberately holds no value — only the show/hide flag, which is
 * presentation and belongs nowhere else. The client and vendor portals use
 * `ControlledPasswordField` from `@sinnapi/ui/forms` instead, which is the same
 * idea bound to a form library this app does not use here.
 */
export default function PasswordField({
  name = 'password',
  label = 'Password',
  autoComplete = 'current-password',
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      name={name}
      type={visible ? 'text' : 'password'}
      label={label}
      autoComplete={autoComplete}
      required
      InputProps={{
        endAdornment: (
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
