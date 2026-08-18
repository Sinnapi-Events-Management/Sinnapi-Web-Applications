import { Box, Button, DialogContent, DialogActions, Alert, Divider, Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateField, ControlledTimeField } from '@sinnapi/ui/forms';
import PaymentTermsStep from '@/components/paymentTerms/components/organisms/PaymentTermsStep';
import { useBookingRequestForm } from '../../hooks/useBookingRequestForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** Date, time, place, budget and payment terms for a direct booking request. */
export default function BookingRequestForm({ vendorId, onCancel, onSuccess }: Props) {
  const form = useBookingRequestForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={form.submit} noValidate>
      <DialogContent>
        {form.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {form.error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* A booking can only be for a date still to come, so the calendar
              simply doesn't offer the past. */}
          <ControlledDateField
            name="event_date"
            control={form.control}
            label="Event date"
            disablePast
          />
          {/* Optional, but worth asking: without it the vendor's first reply is
              always "what time?". The end can't precede the start, because the
              list it is picked from starts one slot after it. */}
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <ControlledTimeField
              name="start_time"
              control={form.control}
              label="Start time (optional)"
              minuteStep={form.slotMinutes}
            />
            <ControlledTimeField
              name="end_time"
              control={form.control}
              label="End time (optional)"
              minuteStep={form.slotMinutes}
              minTime={form.endMinTime}
              disabled={form.endDisabled}
            />
          </Stack>
          <ControlledField name="location" control={form.control} label="Location" />
          <ControlledField
            name="amount"
            control={form.control}
            type="number"
            label="Estimated amount (UGX)"
            inputProps={{ min: 0 }}
            helperText="What you expect this to cost. The payment options below are priced against it."
          />
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Without an amount there is nothing to price, and two cards reading
            "UGX 0" would present the choice as costing nothing either way. */}
        {form.hasAmount ? (
          <PaymentTermsStep choice={form.terms} disabled={form.busy} />
        ) : (
          <Alert severity="info">
            Enter what you expect this to cost and we will show you exactly what each way of paying
            would come to.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={form.busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={!form.canSubmit}>
          {form.busy ? 'Sending…' : 'Send request'}
        </Button>
      </DialogActions>
    </Box>
  );
}
