import { Alert, Box, Divider, Drawer, IconButton, Stack, Typography } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import { BLANK_EVENT, type EventFormValues } from '../../schema';
import EventForm from '../molecules/EventForm';

type Props = {
  open: boolean;
  busy: boolean;
  /** Save failure, surfaced above the fields so it survives a scroll. */
  err: string | null;
  onClose: () => void;
  onSave: (values: EventFormValues) => Promise<boolean>;
};

/**
 * Right-hand drawer for posting a new event. `keepMounted={false}` (MUI's
 * default) matters — unmounting on close discards react-hook-form's state, so
 * the next open starts from the blank template rather than the last draft.
 */
export default function EventCreateDrawer({ open, busy, err, onClose, onSave }: Props) {
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
            Post an event
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Published to the platform as an admin event.
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close create drawer" edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      {err && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {err}
        </Alert>
      )}

      {/* Mounted only while open (below the early states in edit) so RHF resets
          between opens — here the drawer itself is unmounted when closed. */}
      {open && (
        <EventForm
          values={BLANK_EVENT}
          busy={busy}
          submitLabel="Post event"
          submittingLabel="Posting…"
          onCancel={onClose}
          onSave={onSave}
        />
      )}
    </Drawer>
  );
}
