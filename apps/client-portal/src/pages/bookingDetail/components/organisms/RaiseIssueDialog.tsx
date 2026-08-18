import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

const MIN_REASON = 20;

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  isBusy: boolean;
  error: string | null;
};

/**
 * Raising an issue on a funded booking.
 *
 * Deliberately not a one-click action: it freezes the vendor's money and puts
 * a human on the case, so it asks for enough detail to actually adjudicate.
 * The dialog says plainly what happens next — an unexplained freeze is how a
 * dispute process loses both parties' trust at once.
 */
export default function RaiseIssueDialog({ open, onClose, onSubmit, isBusy, error }: Props) {
  const [reason, setReason] = useState('');
  const tooShort = reason.trim().length < MIN_REASON;

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Report a problem with this booking</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            We will freeze the funds still held for this booking and review what happened. Both you
            and your vendor can add evidence, and our team aims to respond within 72 hours.
          </Typography>

          <TextField
            autoFocus
            multiline
            minRows={4}
            fullWidth
            label="What went wrong?"
            placeholder="Tell us what was agreed and what actually happened, with dates if you can."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isBusy}
            error={reason.length > 0 && tooShort}
            helperText={
              reason.length > 0 && tooShort
                ? `Please add a little more detail (${MIN_REASON - reason.trim().length} more characters).`
                : 'The more specific you are, the faster we can resolve this.'
            }
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<ReportProblemIcon />}
          disabled={tooShort || isBusy}
          onClick={async () => {
            await onSubmit(reason.trim());
            onClose();
          }}
        >
          {isBusy ? 'Submitting…' : 'Report problem'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
