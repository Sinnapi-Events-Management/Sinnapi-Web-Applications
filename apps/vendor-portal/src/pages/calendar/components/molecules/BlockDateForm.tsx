import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useBlockDateForm } from '../../hooks/useBlockDateForm';
import AvailabilityCalendar from './AvailabilityCalendar';

type Props = {
  vendorId: string;
  blockedDates: string[];
  bookedDates: string[];
};

/** Pick a day on the grid, say why, block it. */
export default function BlockDateForm({ vendorId, blockedDates, bookedDates }: Props) {
  const { control, error, busy, submit, selectedDate, selectDate, dateError } =
    useBlockDateForm(vendorId);

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <AvailabilityCalendar
        value={selectedDate}
        onChange={selectDate}
        blockedDates={blockedDates}
        bookedDates={bookedDates}
        error={dateError}
      />
      <ControlledField name="reason" control={control} label="Reason (optional)" />
      <Button
        type="submit"
        variant="contained"
        disabled={busy || !selectedDate}
        sx={{ alignSelf: 'flex-start' }}
      >
        {busy ? 'Blocking…' : 'Block date'}
      </Button>
    </Stack>
  );
}
