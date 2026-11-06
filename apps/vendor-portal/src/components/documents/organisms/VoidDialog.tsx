import { useState } from 'react';
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

type Props = {
  open: boolean;
  /** "invoice" or "receipt" — used in the copy. */
  noun: string;
  documentNo: string;
  /** What voiding does, in a sentence the vendor reads before confirming. */
  consequence: string;
  busy: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

/**
 * Voiding asks for a reason: it is printed on the voided document and kept
 * in its history, and the database refuses a void without one.
 */
export default function VoidDialog({
  open,
  noun,
  documentNo,
  consequence,
  busy,
  error,
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Void {noun} {documentNo}?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{consequence}</DialogContentText>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          inputProps={{ maxLength: 500 }}
          helperText="Printed on the voided document."
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} color="inherit">
          Keep it
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={busy || !trimmed}
          onClick={() => onConfirm(trimmed)}
        >
          {busy ? 'Voiding…' : `Void ${noun}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
