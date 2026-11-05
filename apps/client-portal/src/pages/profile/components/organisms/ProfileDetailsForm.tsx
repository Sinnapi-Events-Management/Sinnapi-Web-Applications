import { Alert, Box, Button, Divider, FormField, SectionCard, Stack } from '@sinnapi/ui';
import type { ReactNode } from 'react';
import { ControlledField, ControlledPhoneField, useSavedForm } from '@sinnapi/ui/forms';
import PersonIcon from '@mui/icons-material/PersonOutline';
import { CURRENCY_OPTIONS, profileFormSchema, type ProfileFormValues } from '../../schema';

type Props = {
  /** Last saved values; must be referentially stable per profile revision. */
  values: ProfileFormValues;
  /** The account identity — shown, never written. */
  email: string | null;
  busy: boolean;
  error: string | null;
  onSave: (values: ProfileFormValues) => Promise<boolean>;
  /** The WhatsApp updates switch, rendered under the phone. Saves on its own. */
  whatsapp?: ReactNode;
};

/**
 * The editable personal details. The action bar sits at the bottom of the card and
 * only lights up once something has actually changed, so an untouched form can't
 * fire a pointless write, and "Discard changes" gives the user a way back that
 * isn't a page reload.
 */
export default function ProfileDetailsForm({
  values,
  email,
  busy,
  error,
  onSave,
  whatsapp,
}: Props) {
  const { control, isDirty, revert, submit } = useSavedForm(profileFormSchema, values, onSave);

  return (
    <SectionCard
      title="Personal details"
      subtitle="How you appear to the vendors you book"
      icon={<PersonIcon />}
    >
      <Box component="form" onSubmit={submit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <ControlledField
            name="full_name"
            control={control}
            label="Full name"
            required
            disabled={busy}
          />

          {/* Rendered outside react-hook-form on purpose: an unregistered field
              can't be submitted by accident, which is a stronger guarantee than a
              disabled input that is still part of the form's values. */}
          <FormField
            label="Email"
            type="email"
            value={email ?? ''}
            fullWidth
            disabled
            helperText="Your email is your account identity and can't be changed here."
          />

          <ControlledPhoneField
            name="phone"
            control={control}
            label="Phone"
            disabled={busy}
            helperText="For WhatsApp updates, and when a vendor or our support team needs to reach you about a booking."
          />

          {whatsapp}

          <ControlledField
            name="preferred_currency"
            control={control}
            label="Preferred currency"
            options={CURRENCY_OPTIONS}
            disabled={busy}
            helperText="Quotes and payment amounts are shown in this currency where a vendor supports it."
          />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          justifyContent="flex-end"
        >
          <Button
            onClick={revert}
            disabled={busy || !isDirty}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !isDirty}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </Stack>
      </Box>
    </SectionCard>
  );
}
