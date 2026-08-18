import { Alert, Box, Button, Divider, Stack } from '@sinnapi/ui';
import type { EventFormValues } from '../../schema';
import { useEventForm } from '../../hooks/useEventForm';
import { useEventTypeSelectOptions } from '../../hooks/useEventTypeSelectOptions';
import EventFormFields from './EventFormFields';

type Props = {
  /** Seed values — the blank template for create. */
  values: EventFormValues;
  busy: boolean;
  submitLabel: string;
  /** Busy-state label, e.g. "Posting…". */
  submittingLabel: string;
  /** Gate the submit button on a dirty form (an edit form would want this). */
  requireDirty?: boolean;
  onCancel: () => void;
  onSave: (values: EventFormValues) => Promise<boolean>;
};

/**
 * The event fields plus a pinned action bar. The fields scroll independently of
 * the bar so the submit button is always reachable in a full-height drawer.
 * Everything that varies between uses — seed values, button copy, dirty-gating
 * — comes in as props.
 */
export default function EventForm({
  values,
  busy,
  submitLabel,
  submittingLabel,
  requireDirty = false,
  onCancel,
  onSave,
}: Props) {
  const { control, isDirty, submit } = useEventForm(values, onSave);
  // Read here rather than passed down from the page: the occasion list is
  // reference data this form needs, and nothing above it does.
  const eventTypes = useEventTypeSelectOptions();

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {eventTypes.error && (
          <Alert severity="warning" sx={{ mb: 2.5 }}>
            We couldn’t load the event types just now. You can still post your event and add the
            occasion later.
          </Alert>
        )}
        <EventFormFields
          control={control}
          eventTypeOptions={eventTypes.options}
          eventTypesLoading={eventTypes.isLoading}
        />
      </Box>

      <Divider />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || (requireDirty && !isDirty)}>
          {busy ? submittingLabel : submitLabel}
        </Button>
      </Stack>
    </Box>
  );
}
