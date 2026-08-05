import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useEventForm } from './hooks/useEventForm';

export default function EventForm() {
  const { control, error, busy, submit } = useEventForm();

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate sx={{ maxWidth: 560 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField name="title" control={control} label="Event title" autoFocus />
      <ControlledField name="event_type" control={control} label="Event type (e.g. Wedding)" />
      <ControlledField
        name="event_date"
        control={control}
        type="date"
        label="Event date"
        InputLabelProps={{ shrink: true }}
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
