import { Alert, Box, Divider, Drawer, IconButton, Stack, Typography } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import type { EventTypeModel } from '@/lib/types';
import type { EventTypeFormValues } from '../../schema';
import type { EventTypeDrawerMode } from '../../hooks/useEventTypeEdit';
import EventTypeForm from '../molecules/EventTypeForm';

type Props = {
  open: boolean;
  mode: EventTypeDrawerMode;
  /** The type being edited; null in create mode. */
  eventType: EventTypeModel | null;
  /** Suggested sort order for a new type — one past the current highest. */
  nextSortOrder: number;
  busy: boolean;
  /** Save failure, surfaced above the fields so it survives a scroll. */
  err: string | null;
  onClose: () => void;
  onSave: (values: EventTypeFormValues) => Promise<boolean>;
};

/**
 * Right-hand drawer for creating or editing an event type. Owns the shell; the
 * form and the write live below it.
 *
 * `keepMounted={false}` (MUI's default) matters: unmounting on close discards
 * react-hook-form's state, so the next open — a different type, or a fresh
 * create — starts clean rather than inheriting the last one's edits.
 */
export default function EventTypeDrawer({
  open,
  mode,
  eventType,
  nextSortOrder,
  busy,
  err,
  onClose,
  onSave,
}: Props) {
  const isCreate = mode === 'create';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={busy ? undefined : onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 }, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} noWrap>
            {isCreate ? 'New event type' : 'Edit event type'}
          </Typography>
          {!isCreate && eventType?.name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {eventType.name}
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={onClose}
          disabled={busy}
          aria-label="Close event type drawer"
          edge="end"
        >
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      {err && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {err}
        </Alert>
      )}

      <EventTypeForm
        eventType={eventType}
        isCreate={isCreate}
        nextSortOrder={nextSortOrder}
        busy={busy}
        onCancel={onClose}
        onSave={onSave}
      />
    </Drawer>
  );
}
