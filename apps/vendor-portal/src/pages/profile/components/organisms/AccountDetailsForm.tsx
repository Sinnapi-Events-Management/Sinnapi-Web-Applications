import { Alert, Box, Button, Divider, FormField, SectionCard, Stack } from '@sinnapi/ui';
import { ControlledField, useSavedForm } from '@sinnapi/ui/forms';
import PersonIcon from '@mui/icons-material/PersonOutline';
import { accountFormSchema, type AccountFormValues } from '../../schema';

type Props = {
  /** Last saved values; must be referentially stable per record revision. */
  values: AccountFormValues;
  /** The account identity — shown, never written. */
  email: string | null;
  busy: boolean;
  error: string | null;
  onSave: (values: AccountFormValues) => Promise<boolean>;
};

/**
 * The vendor's own name and phone.
 *
 * Kept separate from the business form on the other tab on purpose: a sole
 * trader's legal name and their trading name are different facts, and the helper
 * text says which one this is so nobody types their brand here and wonders why the
 * listing didn't change.
 */
export default function AccountDetailsForm({ values, email, busy, error, onSave }: Props) {
  const { control, isDirty, revert, submit } = useSavedForm(accountFormSchema, values, onSave);

  return (
    <SectionCard
      title="Your details"
      subtitle="The person behind the business"
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
            label="Your name"
            required
            disabled={busy}
            helperText="Your own name, not your trading name — change that under Business."
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

          <ControlledField
            name="phone"
            control={control}
            label="Phone"
            placeholder="+256 700 000000"
            disabled={busy}
            helperText="Used when a client or our support team needs to reach you about a booking."
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
