import { Box, Button, Divider, Stack } from '@sinnapi/ui';
import type { EventTypeModel } from '@/lib/types';
import type { EventTypeFormValues } from '../../schema';
import { useEventTypeForm } from '../../hooks/useEventTypeForm';
import EventTypeFormFields from './EventTypeFormFields';

type Props = {
  /** The type being edited, or null when creating. */
  eventType: EventTypeModel | null;
  isCreate: boolean;
  /** Suggested sort order for a new type — one past the current highest. */
  nextSortOrder: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: EventTypeFormValues) => Promise<boolean>;
};

/**
 * The event-type fields plus a pinned action bar. The fields scroll
 * independently of the bar so Save is always reachable. Drives both create and
 * edit — the only difference is the button copy and the initial values.
 */
export default function EventTypeForm({
  eventType,
  isCreate,
  nextSortOrder,
  busy,
  onCancel,
  onSave,
}: Props) {
  const { control, isDirty, submit } = useEventTypeForm(eventType, nextSortOrder, onSave);

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <EventTypeFormFields control={control} isCreate={isCreate} />
      </Box>

      <Divider />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || !isDirty}>
          {busy ? 'Saving…' : isCreate ? 'Create event type' : 'Save changes'}
        </Button>
      </Stack>
    </Box>
  );
}
