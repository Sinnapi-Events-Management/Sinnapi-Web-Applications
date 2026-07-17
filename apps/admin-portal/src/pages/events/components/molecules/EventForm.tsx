import { Box, Button, Divider, Stack } from '@sinnapi/ui';
import type { EventFormValues } from '../../schema';
import { useEventForm } from '../../hooks/useEventForm';
import EventFormFields from './EventFormFields';

type Props = {
  /** Seed values — the blank template for create, the fetched record for edit. */
  values: EventFormValues;
  busy: boolean;
  submitLabel: string;
  /** Busy-state label, e.g. "Saving…". */
  submittingLabel: string;
  /** Edit gates Save on a dirty form; create leaves it enabled. */
  requireDirty?: boolean;
  onCancel: () => void;
  onSave: (values: EventFormValues) => Promise<boolean>;
};

/**
 * The event fields plus a pinned action bar. Scrolls independently of the bar
 * so Save is always reachable. Shared by the create and edit drawers — the only
 * differences (seed values, button copy, dirty-gating) come in as props.
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

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <EventFormFields control={control} />
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
