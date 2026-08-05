import { Box, Button, DialogContent, DialogActions, Alert } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useQuoteRequestForm } from '../../hooks/useQuoteRequestForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The brief a client sends when asking a vendor to quote. */
export default function QuoteRequestForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit } = useQuoteRequestForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <ControlledField
          name="details"
          control={control}
          label="Describe your event & requirements"
          multiline
          minRows={4}
          autoFocus
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Sending…' : 'Send request'}
        </Button>
      </DialogActions>
    </Box>
  );
}
