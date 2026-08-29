import { Alert, Box, Button, DialogActions, DialogContent, Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateField, ControlledDateRangeField } from '@sinnapi/ui/forms';
import BlockModeToggle from './BlockModeToggle';
import { useBlockDateForm } from '../../hooks/useBlockDateForm';
import type { BlockDateFormValues } from '../../schema';

type Props = {
  vendorId: string;
  /** The day the grid has selected — where the form opens. */
  date: string;
  today: string;
  /** Days a booking or an earlier block already holds. */
  unavailable: string[];
  onCancel: () => void;
  onSuccess: (outcome: string) => void;
};

/**
 * The days, the reason, and the confirmation.
 *
 * In single mode the picker refuses days that are gone or already spoken for,
 * so the field cannot reach a date the grid itself would have ruled out. A
 * range deliberately does not: a fortnight off is picked by its two ends, and
 * refusing an end because one day inside the fortnight is booked would leave
 * the vendor no way to express the holiday they are actually taking. The days
 * inside it that are already taken are stepped over on write, and the dialog
 * says how many were.
 */
export default function BlockDateFields({
  vendorId,
  date,
  today,
  unavailable,
  onCancel,
  onSuccess,
}: Props) {
  const { control, mode, setMode, disabledDates, error, busy, submit } = useBlockDateForm(
    vendorId,
    { date, today, unavailable, onSuccess },
  );

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <BlockModeToggle value={mode} onChange={setMode} disabled={busy} />

          {mode === 'single' ? (
            <ControlledDateField<BlockDateFormValues>
              name="blocked_date"
              control={control}
              label="Date"
              fullWidth
              disablePast
              disabledDates={disabledDates}
              helperText="Days already booked or blocked cannot be chosen."
            />
          ) : (
            <ControlledDateRangeField<BlockDateFormValues>
              fromName="blocked_date"
              toName="end_date"
              control={control}
              label="Dates"
              fullWidth
              disablePast
              helperText="Days already booked or blocked inside the range are left as they are."
            />
          )}

          <ControlledField
            name="reason"
            control={control}
            label="Reason (optional)"
            helperText="Only you see this. It is never shown to clients."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" color="error" disabled={busy}>
          {busy ? 'Blocking…' : 'Block dates'}
        </Button>
      </DialogActions>
    </Box>
  );
}
