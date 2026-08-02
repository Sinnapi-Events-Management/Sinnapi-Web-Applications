import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useBookingRequestForm } from '../../hooks/useBookingRequestForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** Date, place and budget for a direct booking request. */
export default function BookingRequestForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit } = useBookingRequestForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ControlledField
            name="event_date"
            control={control}
            type="date"
            label="Event date"
            InputLabelProps={{ shrink: true }}
          />
          <ControlledField name="location" control={control} label="Location" />
          <ControlledField
            name="amount"
            control={control}
            type="number"
            label="Estimated amount (UGX)"
            inputProps={{ min: 0 }}
          />
        </Stack>
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
