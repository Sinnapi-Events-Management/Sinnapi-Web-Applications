import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  IconBadge,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { bookingStatusSpec, type BookingStatusTarget } from '../../schema/statusActions';

const ICONS: Record<BookingStatusTarget, ReactNode> = {
  confirmed: <CheckCircleOutlineIcon />,
  in_progress: <PlayCircleOutlineIcon />,
  completed: <TaskAltIcon />,
  cancelled: <EventBusyIcon />,
};

type Props = {
  pending: BookingStatusTarget | null;
  reference: string | null;
  reason: string;
  onReasonChange: (value: string) => void;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * One dialog for all four overrides. Everything that differs — heading,
 * consequence copy, button label, colour — comes from the status spec, so a
 * fifth target is a new entry in `schema/statusActions.ts` and nothing here.
 *
 * `BookingActionDialog` from the shared package was not reused: it describes
 * the same transitions to the party making them, in their own words and with
 * an optional reason. Here the reason is mandatory and the copy addresses
 * someone acting on a booking that is not theirs — enough difference that
 * sharing one component would mean branching on audience inside it.
 *
 * Presentation only. The action, its in-flight state and the reason belong to
 * `useBookingStatus`.
 */
export default function BookingStatusDialog({
  pending,
  reference,
  reason,
  onReasonChange,
  busy,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const spec = pending ? bookingStatusSpec(pending) : null;
  const canSubmit = !busy && reason.trim().length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm();
  }

  return (
    <Dialog
      open={!!pending}
      // Blocked while the override is in flight: dismissing mid-request would
      // leave the operator unsure whether someone's booking just moved.
      onClose={busy ? undefined : onCancel}
      fullWidth
      maxWidth="xs"
      PaperProps={{ component: 'form', onSubmit: handleSubmit, sx: { borderRadius: 4 } }}
    >
      <DialogContent sx={{ px: { xs: 3, sm: 4 }, pt: 4, pb: 2, textAlign: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <IconBadge accent={spec?.tone ?? 'secondary'} size={64} circular>
            {pending ? ICONS[pending] : null}
          </IconBadge>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {spec?.title.replace('{ref}', reference ?? '')}
          </Typography>
          <DialogContentText sx={{ color: 'text.secondary', m: 0 }}>
            {spec?.description}
          </DialogContentText>
        </Stack>

        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          multiline
          minRows={3}
          required
          fullWidth
          disabled={busy}
          sx={{ mt: 3, textAlign: 'left' }}
          helperText="Recorded on the booking's trail and in the audit log, under your name."
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 3, sm: 4 },
          pb: 3,
          pt: 1,
          gap: 1.5,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          disabled={busy}
          sx={{ m: 0 }}
        >
          Keep as is
        </Button>
        <Button
          fullWidth
          type="submit"
          color={spec?.tone ?? 'secondary'}
          variant="contained"
          disableElevation
          disabled={!canSubmit}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ m: 0 }}
        >
          {spec?.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
