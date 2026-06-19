import { useState } from 'react';
import { Stack, TextField, Button, Alert, Snackbar, Typography } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

// Calls set_vendor_bank_account RPC, which ENCRYPTS the account number server-side.
// The raw number is never read back to the client (only last4 is shown elsewhere).
export default function BankAccountForm({ vendorId }: { vendorId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.rpc('set_vendor_bank_account', {
      p_vendor_id: vendorId,
      p_bank_name: String(form.get('bank_name')),
      p_account_name: String(form.get('account_name')),
      p_account_number: String(form.get('account_number')),
      p_branch: String(form.get('branch')) || null,
      p_is_primary: true,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setToast(true);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={save} sx={{ maxWidth: 480 }}>
      <Typography variant="body2" color="text.secondary">
        Used for payouts. Your account number is encrypted and never displayed again — re-enter it
        to change it.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField name="bank_name" label="Bank name" required />
      <TextField name="account_name" label="Account name" required />
      <TextField name="account_number" label="Account number" required />
      <TextField name="branch" label="Branch" />
      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
        {busy ? 'Saving…' : 'Save bank account'}
      </Button>
      <Snackbar
        open={toast}
        autoHideDuration={3000}
        onClose={() => setToast(false)}
        message="Bank account saved (pending verification)"
      />
    </Stack>
  );
}
