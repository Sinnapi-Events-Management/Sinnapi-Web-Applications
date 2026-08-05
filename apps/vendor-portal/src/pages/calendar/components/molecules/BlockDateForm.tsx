import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useBlockDateForm } from '../../hooks/useBlockDateForm';

/** The "block a date" fields and their write. */
export default function BlockDateForm({ vendorId }: { vendorId: string }) {
  const { control, error, busy, submit } = useBlockDateForm(vendorId);

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField
        name="blocked_date"
        control={control}
        type="date"
        label="Date"
        InputLabelProps={{ shrink: true }}
      />
      <ControlledField name="reason" control={control} label="Reason (optional)" />
      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
        {busy ? 'Blocking…' : 'Block date'}
      </Button>
    </Stack>
  );
}
