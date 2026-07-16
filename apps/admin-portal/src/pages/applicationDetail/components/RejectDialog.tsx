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
  busy: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

/** Confirmation dialog capturing a required rejection reason. */
export default function RejectDialog({ open, busy, onClose, onSubmit }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ component: 'form', onSubmit, sx: { borderRadius: 3 } }}
    >
      <DialogTitle>Reject application</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          The applicant will be notified. Add a clear reason for the rejection.
        </DialogContentText>
        <TextField
          name="reason"
          label="Reason"
          multiline
          minRows={3}
          required
          autoFocus
          fullWidth
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" color="error" variant="contained" disabled={busy}>
          Reject application
        </Button>
      </DialogActions>
    </Dialog>
  );
}
