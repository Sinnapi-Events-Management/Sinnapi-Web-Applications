import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import type { ContactListModel } from '@/lib/types';

type Props = {
  open: boolean;
  count: number;
  lists: ContactListModel[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (input: { title: string; description: string; listId: string | null }) => void;
};

const NEW_LIST = '__new__';

/**
 * Name the list, or add it to one that already has a name.
 *
 * ── Why the title and description are asked for here ──────────────────────
 * This is the last moment the answers are cheap. The operator has the file open
 * and knows these are the people who scanned the QR code at the Kampala expo in
 * March; a week later the same list is "contacts (3).xlsx" and nobody can say
 * whether it may be mailed. The title is what they will select by next time and
 * the description is what tells the next admin — or the same one in six months
 * — where these people came from and what they agreed to.
 *
 * ── Why "add to an existing book" is the first control ────────────────────
 * The commonest real action is the second upload of a list that already exists,
 * and an operator who cannot see that option invents "Expo 2026 v2". Choosing
 * an existing book merges into it: new people are added, names already there
 * are refreshed, and nobody is removed.
 */
export default function SaveContactListDialog({
  open,
  count,
  lists,
  saving,
  error,
  onCancel,
  onSave,
}: Props) {
  const [target, setTarget] = useState<string>(NEW_LIST);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Reopening after a save should not present the previous list's details.
  useEffect(() => {
    if (!open) return;
    setTarget(NEW_LIST);
    setTitle('');
    setDescription('');
  }, [open]);

  const existing = lists.find((l) => l.id === target) ?? null;
  const effectiveTitle = existing ? existing.title : title;
  const valid = effectiveTitle.trim().length >= 2 && count > 0;

  const submit = () => {
    if (!valid || saving) return;
    onSave({
      title: effectiveTitle.trim(),
      description: existing ? '' : description.trim(),
      listId: existing?.id ?? null,
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Save {count.toLocaleString()} contacts to an address book</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            select
            label="Address book"
            value={target}
            disabled={saving}
            onChange={(e) => setTarget(e.target.value)}
            helperText={
              existing
                ? 'These contacts are added to it. Names already there are updated; nobody is removed.'
                : 'Give it a title you will recognise in a year.'
            }
            fullWidth
          >
            <MenuItem value={NEW_LIST}>New address book…</MenuItem>
            {lists.map((list) => (
              <MenuItem key={list.id} value={list.id}>
                {list.title} · {list.contact_count.toLocaleString()} contacts
              </MenuItem>
            ))}
          </TextField>

          {!existing && (
            <>
              <TextField
                label="Title"
                value={title}
                disabled={saving}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kampala Expo 2026 — booth sign-ups"
                helperText="How you'll find these people next time."
                autoFocus
                fullWidth
              />
              <TextField
                label="Description"
                value={description}
                disabled={saving}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Collected on the sign-up sheet at our stand, 4–6 March 2026. Ticked the box to hear about upcoming events."
                helperText="Where they came from and what they agreed to — the question you'll be asked if somebody complains."
                multiline
                minRows={2}
                fullWidth
              />
            </>
          )}

          <Typography variant="caption" color="text.secondary">
            An address book stores names and addresses only. It is not a consent record: every send
            still asks you to confirm you hold consent, and anyone on the suppression list is
            skipped no matter which book they are in.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" color="inherit" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Saving…' : existing ? 'Add to address book' : 'Create address book'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
