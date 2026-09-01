import { FormField, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { AccountFormValues } from '../../schema';

type Props = {
  control: Control<AccountFormValues>;
  /** The account identity — shown, never written. */
  email: string | null;
  disabled?: boolean;
};

/**
 * The person's own name, email and phone.
 *
 * Email is rendered outside react-hook-form on purpose: an unregistered field
 * can't be submitted by accident, which is a stronger guarantee than a disabled
 * input that is still part of the form's values.
 */
export default function AccountIdentityFields({ control, email, disabled }: Props) {
  return (
    <Stack spacing={2.5}>
      <ControlledField
        name="full_name"
        control={control}
        label="Your name"
        required
        disabled={disabled}
        helperText="Your own name, not your trading name — change that under Business."
      />

      <FormField
        label="Email"
        type="email"
        value={email ?? ''}
        fullWidth
        disabled
        helperText="Your email is your account identity and can't be changed here."
      />

      <ControlledField
        name="phone"
        control={control}
        label="Phone"
        placeholder="+256 700 000000"
        disabled={disabled}
        helperText="Used when a client or our support team needs to reach you about a booking."
      />
    </Stack>
  );
}
