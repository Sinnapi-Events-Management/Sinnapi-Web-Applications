import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@sinnapi/ui';
import type { SettingModel } from '@/lib/types';

type Props = {
  /** The setting being edited; null keeps the dialog closed. */
  setting: SettingModel | null;
  busy: boolean;
  /** Save failure, surfaced above the field. */
  err: string | null;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
};

/**
 * Modal for editing a single platform setting. The value is edited as raw JSON;
 * parsing and the write are owned by the page (see `useSettings`), so this shell
 * only collects the field and surfaces the save error.
 */
export default function SettingEditDialog({ setting, busy, err, onClose, onSave }: Props) {
  return (
    <Dialog
      open={!!setting}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ component: 'form', onSubmit: onSave }}
      sx={{ backdropFilter: 'blur(6px)' }}
    >
      <DialogTitle>Edit {setting?.key}</DialogTitle>
      <DialogContent>
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        <TextField
          name="value"
          label="Value (JSON)"
          defaultValue={JSON.stringify(setting?.value)}
          fullWidth
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
