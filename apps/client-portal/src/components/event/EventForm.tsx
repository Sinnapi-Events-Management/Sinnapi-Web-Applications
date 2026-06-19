import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, TextField, Button, Alert } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

export default function EventForm() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError('Session expired.');
      return;
    }
    const { error } = await supabase.from('events').insert({
      posted_by: user.id,
      source: 'client',
      title: String(form.get('title')),
      description: String(form.get('description')) || null,
      event_type: String(form.get('event_type')) || null,
      event_date: String(form.get('event_date')) || null,
      location: String(form.get('location')) || null,
      status: 'published',
      is_public: true,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/my-events');
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={save} sx={{ maxWidth: 560 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField name="title" label="Event title" required />
      <TextField name="event_type" label="Event type (e.g. Wedding)" />
      <TextField
        name="event_date"
        type="date"
        label="Event date"
        InputLabelProps={{ shrink: true }}
      />
      <TextField name="location" label="Location" />
      <TextField name="description" label="Description" multiline minRows={4} />
      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
        {busy ? 'Posting…' : 'Post event'}
      </Button>
    </Stack>
  );
}
