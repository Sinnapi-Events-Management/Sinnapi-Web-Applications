'use client';
import { useState, type FormEvent } from 'react';
import { Alert, IconButton, Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export type MessageComposerProps = {
  /**
   * Sends the trimmed message body. Reject (or throw) to surface the failure —
   * the composer renders the error and keeps the draft so nothing is lost.
   */
  onSend: (body: string) => Promise<void>;
  placeholder?: string;
  /** Max rows before the input starts scrolling instead of growing. */
  maxRows?: number;
};

/**
 * Message input with inline send + error handling. Purely presentational: it
 * owns the draft, the busy state and the failure surface, while persistence is
 * injected via `onSend`, so the portals share one composer without this package
 * taking on a data-layer dependency.
 *
 * The send affordance uses `secondary` — it is an action, and gold is the
 * portals' action colour.
 */
export function MessageComposer({
  onSend,
  placeholder = 'Type a message…',
  maxRows = 4,
}: MessageComposerProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = value.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(body);
      // Cleared only on success, so a failed send leaves the draft recoverable.
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack component="form" onSubmit={submit} spacing={1}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          multiline
          maxRows={maxRows}
          // Fills whatever column it lands in — the inbox thread pane is far
          // narrower than the standalone conversation page.
          fullWidth
        />
        <IconButton type="submit" color="secondary" disabled={busy} aria-label="Send">
          <SendIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}
