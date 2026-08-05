import { Stack, Button, Alert, Snackbar, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useBankAccountForm } from './hooks/useBankAccountForm';

// Calls set_vendor_bank_account RPC, which ENCRYPTS the account number server-side.
// The raw number is never read back to the client (only last4 is shown elsewhere).
export default function BankAccountForm({ vendorId }: { vendorId: string }) {
  const { control, error, busy, toast, dismissToast, submit } = useBankAccountForm(vendorId);

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate sx={{ maxWidth: 480 }}>
      <Typography variant="body2" color="text.secondary">
        Used for payouts. Your account number is encrypted and never displayed again — re-enter it
        to change it.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField name="bank_name" control={control} label="Bank name" />
      <ControlledField name="account_name" control={control} label="Account name" />
      <ControlledField name="account_number" control={control} label="Account number" />
      <ControlledField name="branch" control={control} label="Branch" />
      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
        {busy ? 'Saving…' : 'Save bank account'}
      </Button>
      <Snackbar
        open={toast}
        autoHideDuration={3000}
        onClose={dismissToast}
        message="Bank account saved (pending verification)"
      />
    </Stack>
  );
}
