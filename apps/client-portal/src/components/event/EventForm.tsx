import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField, ControlledDateField } from '@sinnapi/ui/forms';
import { useEventForm } from './hooks/useEventForm';

export default function EventForm() {
  const { control, error, busy, submit } = useEventForm();

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate sx={{ maxWidth: 560 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField name="title" control={control} label="Event title" autoFocus />
      <ControlledField name="event_type" control={control} label="Event type (e.g. Wedding)" />
      {/* An event is posted for vendors to bid on, so only future dates make
          sense — the field itself stays optional, as the schema has it. */}
      <ControlledDateField
        name="event_date"
        control={control}
        label="Event date (optional)"
        disablePast
      />
      <ControlledField name="location" control={control} label="Location" />
      <ControlledField
        name="description"
        control={control}
        label="Description"
        multiline
        minRows={4}
      />
      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
        {busy ? 'Posting…' : 'Post event'}
      </Button>
    </Stack>
  );
}
