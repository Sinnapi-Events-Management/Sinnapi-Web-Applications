import { FormField, Grid } from '@sinnapi/ui';
import type { ReactNode } from 'react';
import { ControlledField, ControlledPhoneField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { AccountFormValues } from '../../schema';

type Props = {
  control: Control<AccountFormValues>;
  /** The account identity — shown, never written. */
  email: string | null;
  disabled?: boolean;
  /** The WhatsApp updates switch, under the phone. Saves on its own. */
  whatsapp?: ReactNode;
};

/**
 * The person's own name, phone and email.
 *
 * Email is rendered outside react-hook-form on purpose: an unregistered field
 * can't be submitted by accident, which is a stronger guarantee than a disabled
 * input that is still part of the form's values.
 */
export default function AccountIdentityFields({ control, email, disabled, whatsapp }: Props) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} sm={6}>
        <ControlledField
          name="full_name"
          control={control}
          label="Your name"
          required
          disabled={disabled}
          helperText="Your own name, not your trading name."
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <ControlledPhoneField
          name="phone"
          control={control}
          label="Phone"
          disabled={disabled}
          helperText="For WhatsApp updates, and for clients and support to reach you."
        />
      </Grid>
      {whatsapp && (
        <Grid item xs={12}>
          {whatsapp}
        </Grid>
      )}
      <Grid item xs={12}>
        <FormField
          label="Email"
          type="email"
          value={email ?? ''}
          fullWidth
          disabled
          helperText="Your sign-in identity — contact support to change it."
        />
      </Grid>
    </Grid>
  );
}
