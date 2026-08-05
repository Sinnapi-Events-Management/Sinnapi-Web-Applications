import { Stack, Button, Alert, Snackbar } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { CURRENCY_OPTIONS, type ProfileFormSource } from './schema';
import { useProfileForm } from './hooks/useProfileForm';

type Props = { profile: ProfileFormSource & { id: string } };

export default function ProfileForm({ profile }: Props) {
  const { control, error, busy, isDirty, toast, dismissToast, submit } = useProfileForm(profile);

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate sx={{ maxWidth: 480 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField name="full_name" control={control} label="Full name" />
      <ControlledField name="phone" control={control} label="Phone" />
      <ControlledField
        name="preferred_currency"
        control={control}
        label="Preferred currency"
        options={CURRENCY_OPTIONS}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={busy || !isDirty}
        sx={{ alignSelf: 'flex-start' }}
      >
        {busy ? 'Saving…' : 'Save changes'}
      </Button>
      <Snackbar
        open={toast}
        autoHideDuration={3000}
        onClose={dismissToast}
        message="Profile updated"
      />
    </Stack>
  );
}
