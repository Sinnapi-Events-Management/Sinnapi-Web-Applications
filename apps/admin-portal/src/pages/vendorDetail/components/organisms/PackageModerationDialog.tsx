import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@sinnapi/ui';
import type { PackageModel } from '@/lib/types';

type Props = {
  pkg: PackageModel | null;
  reason: string;
  busy: boolean;
  error: string | null;
  onReason: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Taking a package off the market, with the reason on the record.
 *
 * The reason is required and is quoted verbatim to the vendor in the
 * notification this raises, which is what the copy under the field says — an
 * operator writing "spam" should know that is the whole explanation the vendor
 * will get.
 *
 * Not the shared `ConfirmDialog`: this needs a required free-text field, and a
 * confirm dialog that grows an input is a confirm dialog that should have been
 * its own component.
 */
export default function PackageModerationDialog({
  pkg,
  reason,
  busy,
  error,
  onReason,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog open={pkg != null} onClose={busy ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Take “{pkg?.name}” off the market?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          It becomes private immediately and the vendor cannot republish it themselves. Their
          existing quotes are unaffected.
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Reason"
          value={reason}
          onChange={(event) => onReason(event.target.value)}
          helperText="Sent to the vendor word for word, so write it for them to read."
          multiline
          minRows={3}
          fullWidth
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy} color="inherit" variant="text">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy || reason.trim().length === 0}
          color="error"
          variant="contained"
        >
          {busy ? 'Taking down…' : 'Take down'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
