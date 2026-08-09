import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateField, ControlledTimeField } from '@sinnapi/ui/forms';
import { useBookingRequestForm } from '../../hooks/useBookingRequestForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** Date, time, place and budget for a direct booking request. */
export default function BookingRequestForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit, slotMinutes, endMinTime, endDisabled } =
    useBookingRequestForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* A booking can only be for a date still to come, so the calendar
              simply doesn't offer the past. */}
          <ControlledDateField name="event_date" control={control} label="Event date" disablePast />
          {/* Optional, but worth asking: without it the vendor's first reply is
              always "what time?". The end can't precede the start, because the
              list it is picked from starts one slot after it. */}
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <ControlledTimeField
              name="start_time"
              control={control}
              label="Start time (optional)"
              minuteStep={slotMinutes}
            />
            <ControlledTimeField
              name="end_time"
              control={control}
              label="End time (optional)"
              minuteStep={slotMinutes}
              minTime={endMinTime}
              disabled={endDisabled}
            />
          </Stack>
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
