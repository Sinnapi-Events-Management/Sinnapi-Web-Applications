import { IconButton, InputAdornment, Tooltip } from '@sinnapi/ui';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import ControlledField from './ControlledField';

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  /** Governs the whole form's reveal state, so all three fields toggle together. */
  visible: boolean;
  onToggleVisible: () => void;
  /** Native autocomplete token — `current-password` or `new-password`. */
  autoComplete: string;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * A password input with a reveal toggle. Split out because all three fields on
 * the security form need identical adornment, sizing and a11y wiring, and a
 * mistyped `type` on any one of them would silently leak a password into the
 * browser's autofill history.
 */
export default function PasswordField<T extends FieldValues>({
  name,
  control,
  label,
  visible,
  onToggleVisible,
  autoComplete,
  helperText,
  disabled,
  autoFocus,
}: Props<T>) {
  return (
    <ControlledField
      name={name}
      control={control}
      label={label}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      helperText={helperText}
      disabled={disabled}
      autoFocus={autoFocus}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={visible ? 'Hide passwords' : 'Show passwords'}>
              <IconButton
                onClick={onToggleVisible}
                edge="end"
                size="small"
                aria-label={visible ? 'Hide passwords' : 'Show passwords'}
              >
                {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}
