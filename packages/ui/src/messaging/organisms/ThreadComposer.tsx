'use client';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  Alert,
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {
  ComposerAttachmentTray,
  type PendingAttachment,
} from '../molecules/ComposerAttachmentTray';

/** Beyond this the counter appears; the send is blocked at the hard limit. */
const SOFT_LIMIT = 4500;
const HARD_LIMIT = 5000;

/** Quiet period after the last keystroke before "typing" is withdrawn. */
const TYPING_IDLE_MS = 2500;

/** Minimum gap between typing broadcasts, so a fast typist sends ~1/s. */
const TYPING_THROTTLE_MS = 1200;

export type ThreadComposerProps = {
  /**
   * Sends the trimmed body and any staged attachments. Reject (or throw) to
   * surface the failure — the composer renders it and keeps the draft, so
   * nothing the user typed is lost to a dropped connection.
   */
  onSend: (body: string, attachments: PendingAttachment[]) => Promise<void>;
  /**
   * Called with `true` on the first keystroke of a burst and `false` once the
   * user goes idle or sends. Wired to a realtime broadcast by the caller; the
   * composer owns only the debounce.
   */
  onTypingChange?: (typing: boolean) => void;
  /** Staged files, owned by the caller's upload hook. */
  attachments?: PendingAttachment[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  placeholder?: string;
  /** Replaces the whole composer with an explanation — archived/blocked threads. */
  disabledReason?: string | null;
  maxRows?: number;
  autoFocus?: boolean;
  /** `accept` for the file picker; mirrors the bucket's allowed mime types. */
  accept?: string;
};

const DEFAULT_ACCEPT =
  'image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,application/pdf,' +
  'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'text/plain,text/csv';

/**
 * The message input: draft, attachments, typing signal, send.
 *
 * Presentational in the sense that matters — it owns no persistence and no
 * realtime client. `onSend` and `onTypingChange` are injected, which is what
 * lets `@sinnapi/ui` stay free of a data-layer dependency while all three
 * portals share one composer.
 *
 * ENTER SENDS, SHIFT+ENTER BREAKS THE LINE. This is the convention every
 * messaging product uses, and getting it wrong is felt on literally every
 * message. It is suppressed while an IME composition is active — otherwise
 * confirming a candidate mid-word fires the send.
 */
export function ThreadComposer({
  onSend,
  onTypingChange,
  attachments = [],
  onAttachFiles,
  onRemoveAttachment,
  placeholder = 'Type a message…',
  disabledReason = null,
  maxRows = 6,
  autoFocus = false,
  accept = DEFAULT_ACCEPT,
}: ThreadComposerProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);

  // Typing signal: a ref for the current state so the debounce does not have to
  // re-run on every render, and a timer that withdraws it after a quiet period.
  const typingSent = useRef(false);
  const lastPing = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
    if (typingSent.current) {
      typingSent.current = false;
      onTypingChange?.(false);
    }
  };

  const pingTyping = () => {
    if (!onTypingChange) return;
    const now = Date.now();
    if (!typingSent.current || now - lastPing.current > TYPING_THROTTLE_MS) {
      typingSent.current = true;
      lastPing.current = now;
      onTypingChange(true);
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  // Leaving the thread mid-sentence must not strand a "typing…" on the other
  // side forever.
  useEffect(() => stopTyping, []); // eslint-disable-line react-hooks/exhaustive-deps

  const uploading = attachments.some((a) => a.progress != null && a.progress < 100);
  const overLimit = value.length > HARD_LIMIT;
  const canSend =
    (value.trim().length > 0 || attachments.length > 0) && !busy && !uploading && !overLimit;

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;

    setBusy(true);
    setError(null);
    stopTyping();
    try {
      await onSend(value.trim(), attachments);
      // Cleared only on success, so a failed send leaves the draft recoverable.
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Enter' || e.shiftKey || composing.current) return;
    e.preventDefault();
    void submit();
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onAttachFiles?.(files);
    // Reset so picking the same file twice in a row still fires a change event.
    e.target.value = '';
  }

  if (disabledReason) {
    return (
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          textAlign: 'center',
          bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {disabledReason}
        </Typography>
      </Box>
    );
  }

  return (
    <Stack component="form" onSubmit={submit} spacing={1}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {onRemoveAttachment && (
        <ComposerAttachmentTray items={attachments} onRemove={onRemoveAttachment} disabled={busy} />
      )}

      <Stack direction="row" spacing={1} alignItems="flex-end">
        {onAttachFiles && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={accept}
              onChange={onPick}
              style={{ display: 'none' }}
              aria-hidden
              tabIndex={-1}
            />
            <Tooltip title="Attach a file">
              <span>
                <IconButton
                  onClick={() => fileRef.current?.click()}
                  disabled={busy || attachments.length >= 10}
                  aria-label="Attach a file"
                >
                  <AttachFileIcon />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}

        <TextField
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            pingTyping();
          }}
          onKeyDown={onKeyDown}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onBlur={stopTyping}
          placeholder={placeholder}
          multiline
          maxRows={maxRows}
          autoFocus={autoFocus}
          fullWidth
          error={overLimit}
          inputProps={{ 'aria-label': 'Message' }}
        />

        <Tooltip title={canSend ? 'Send (Enter)' : 'Type a message to send'}>
          <span>
            <IconButton type="submit" color="secondary" disabled={!canSend} aria-label="Send">
              <SendIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Silent until the message is long enough for the limit to be a real
          risk — a counter on every draft is nagging, not helpful. */}
      {value.length > SOFT_LIMIT && (
        <Typography
          variant="caption"
          sx={{ alignSelf: 'flex-end', color: overLimit ? 'error.main' : 'text.secondary' }}
        >
          {value.length.toLocaleString()} / {HARD_LIMIT.toLocaleString()}
        </Typography>
      )}
    </Stack>
  );
}
