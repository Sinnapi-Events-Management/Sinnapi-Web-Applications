import { Box, Button, DialogContent, DialogActions, Alert } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useDisputeForm } from '../../hooks/useDisputeForm';

type Props = {
  escrowId: string;
  onCancel: () => void;
  /** Called once the dispute is accepted — closes the dialog. */
  onSuccess: () => void;
};

/**
 * The dispute reason plus its submit. Mounted only while the dialog is open, so
 * a cancelled draft never reappears the next time it is raised.
 */
export default function DisputeForm({ escrowId, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit } = useDisputeForm(escrowId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <ControlledField
          name="reason"
          control={control}
          label="What went wrong?"
          multiline
          minRows={3}
          autoFocus
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" color="error" variant="contained" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit dispute'}
        </Button>
      </DialogActions>
    </Box>
  );
}
