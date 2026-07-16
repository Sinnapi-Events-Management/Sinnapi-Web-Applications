import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
} from '@sinnapi/ui';

type Props = {
  open: boolean;
  title: string;
  /** Explains what the action does — say the consequence, not just "are you sure". */
  message: React.ReactNode;
  confirmLabel: string;
  confirmColor?: 'primary' | 'error' | 'success';
  busy?: boolean;
  /** Require a free-text justification before the action can be confirmed. */
  requireReason?: boolean;
  reasonLabel?: string;
  onClose: () => void;
  /** Receives the typed reason, or '' when `requireReason` is off. */
  onConfirm: (reason: string) => void;
};

/**
 * Generic confirmation for a destructive or otherwise irreversible action.
 * Presentation only — the caller owns the action and its in-flight state.
 * The dialog unmounts when closed, so the reason field resets between opens.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor = 'primary',
  busy = false,
  requireReason = false,
  reasonLabel = 'Reason',
  onClose,
  onConfirm,
}: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = requireReason
      ? String(new FormData(e.currentTarget).get('reason') ?? '').trim()
      : '';
    onConfirm(reason);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ component: 'form', onSubmit: handleSubmit, sx: { borderRadius: 3 } }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: requireReason ? 2 : 0 }}>{message}</DialogContentText>
        {requireReason && (
          <TextField
            name="reason"
            label={reasonLabel}
            multiline
            minRows={3}
            required
            autoFocus
            fullWidth
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" color={confirmColor} variant="contained" disabled={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
