import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, TextField, Button, Alert, MenuItem, Snackbar } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  preferred_currency: string | null;
};

export default function ProfileForm({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: String(form.get('full_name')),
        phone: String(form.get('phone')) || null,
        preferred_currency: String(form.get('preferred_currency')),
      })
      .eq('id', profile.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setToast(true);
    qc.invalidateQueries({ queryKey: ['profile'] });
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={save} sx={{ maxWidth: 480 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        name="full_name"
        label="Full name"
        defaultValue={profile.full_name ?? ''}
        required
      />
      <TextField name="phone" label="Phone" defaultValue={profile.phone ?? ''} />
      <TextField
        name="preferred_currency"
        label="Preferred currency"
        select
        defaultValue={profile.preferred_currency ?? 'UGX'}
      >
        <MenuItem value="UGX">UGX — Ugandan Shilling</MenuItem>
        <MenuItem value="USD">USD — US Dollar</MenuItem>
      </TextField>
      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
        {busy ? 'Saving…' : 'Save changes'}
      </Button>
      <Snackbar
        open={toast}
        autoHideDuration={3000}
        onClose={() => setToast(false)}
        message="Profile updated"
      />
    </Stack>
  );
}
