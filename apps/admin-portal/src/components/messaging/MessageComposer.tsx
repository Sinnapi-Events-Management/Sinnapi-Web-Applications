import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, TextField, IconButton, Alert } from '@sinnapi/ui';
import SendIcon from '@mui/icons-material/Send';
import { supabase } from '@/lib/supabase';

// Inserted directly under RLS (policy: sender_id = auth.uid() AND participant).
export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const qc = useQueryClient();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError('Session expired — please sign in again.');
      return;
    }
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: value.trim(),
      moderation_status: 'pending',
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setValue('');
    qc.invalidateQueries({ queryKey: ['messages', conversationId] });
  }

  return (
    <Stack component="form" onSubmit={send} spacing={1}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a message…"
          multiline
          maxRows={4}
        />
        <IconButton type="submit" color="primary" disabled={busy} aria-label="Send">
          <SendIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}
