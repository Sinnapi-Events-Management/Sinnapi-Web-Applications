'use client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { IconBadge } from '../../molecules/IconBadge';
import { DELETION_CONFIRM_PHRASE } from '../schema/deletionRequest';
import { useDeletionRequestForm } from '../hooks/useDeletionRequestForm';
import type { RequestDeletionHandler } from '../types';

export type RequestDeletionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: RequestDeletionHandler;
  /** What this portal cannot erase, in its own terms (bookings, payouts, …). */
  retentionNote: string;
};

/**
 * Erasure-request dialog.
 *
 * States the consequence before the controls, not after: the user needs to know
 * that some records survive under legal retention *while* deciding, and a
 * caveat placed under the confirm button is a caveat read after the decision.
 */
export function RequestDeletionDialog({
  open,
  onClose,
  onSubmit,
  retentionNote,
}: RequestDeletionDialogProps) {
  const form = useDeletionRequestForm({ onSubmit, onSuccess: onClose });

  function dismiss() {
    if (form.submitting) return;
    form.clear();
    onClose();
  }

  return (
    <Dialog open={open} onClose={dismiss} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconBadge accent="error">
            <DeleteForeverIcon />
          </IconBadge>
          <Stack>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Request data deletion
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Reviewed by our compliance team before anything is erased.
            </Typography>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5}>
          {form.error && <Alert severity="error">{form.error}</Alert>}

          <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
            {retentionNote}
          </Alert>

          <TextField
            label="Reason (optional)"
            placeholder="Tell us why you are asking, if you would like to."
            value={form.reason}
            onChange={(e) => form.setReason(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            disabled={form.submitting}
            helperText={`${form.reason.length}/${form.reasonLimit}`}
            FormHelperTextProps={{ sx: { textAlign: 'right', m: 0, mt: 0.5 } }}
          />

          <TextField
            label={`Type ${DELETION_CONFIRM_PHRASE} to confirm`}
            value={form.confirmation}
            onChange={(e) => form.setConfirmation(e.target.value)}
            fullWidth
            disabled={form.submitting}
            autoComplete="off"
            inputProps={{ 'aria-label': `Type ${DELETION_CONFIRM_PHRASE} to confirm` }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={dismiss} disabled={form.submitting} color="inherit" variant="text">
          Cancel
        </Button>
        <Button
          onClick={() => form.submit()}
          variant="contained"
          color="error"
          disabled={!form.confirmed || form.submitting}
          startIcon={form.submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {form.submitting ? 'Submitting…' : 'Submit request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
