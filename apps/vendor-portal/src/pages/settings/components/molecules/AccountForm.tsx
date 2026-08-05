import { Stack, Button, Alert, Snackbar, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { ProfileModel } from '@/lib/types';
import { useAccountForm } from '../../hooks/useAccountForm';

/** The vendor's own name and phone. Email is shown but never editable here. */
export default function AccountForm({ profile }: { profile: ProfileModel }) {
  const { control, error, busy, isDirty, toast, dismissToast, submit } = useAccountForm(profile);

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate sx={{ maxWidth: 480 }}>
      <Typography variant="body2" color="text.secondary">
        Signed in as <strong>{profile.email}</strong>
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField name="full_name" control={control} label="Your name" />
      <ControlledField name="phone" control={control} label="Phone" />
      <Button
        type="submit"
        variant="contained"
        disabled={busy || !isDirty}
        sx={{ alignSelf: 'flex-start' }}
      >
        {busy ? 'Saving…' : 'Save'}
      </Button>
      <Snackbar
        open={toast}
        autoHideDuration={3000}
        onClose={dismissToast}
        message="Account updated"
      />
    </Stack>
  );
}
