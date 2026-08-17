'use client';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { IconBadge } from '../molecules/IconBadge';
import { paymentChaseSpec, type PaymentChaseAction } from '../molecules/paymentWindow';

const ICONS: Record<PaymentChaseAction, ReactNode> = {
  nudge: <NotificationsActiveIcon />,
  extend: <MoreTimeIcon />,
  cancel: <EventBusyIcon />,
};

/**
 * The extension lengths anyone actually grants, as a short list.
 *
 * A free number field invites someone to type 5000 and find out from a server
 * error that the ceiling is 720. These are the four answers to "how much longer
 * do they need" — the rest of the day, another day, a working week, or a
 * fortnight — and each of them is a decision rather than an arithmetic problem.
 */
const EXTENSION_CHOICES = [
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '1 week' },
];

export type PaymentChaseDialogProps = {
  /** The action awaiting confirmation, or `null` when the dialog is closed. */
  action: PaymentChaseAction | null;
  /** Booking reference, woven into the heading so the modal names its subject. */
  reference?: string | null;
  /** Free text. Owned by the caller's hook — this component holds no state. */
  reason: string;
  onReasonChange: (value: string) => void;
  /** Extension length in hours. Only read when the action is `extend`. */
  hours: number;
  onHoursChange: (value: number) => void;
  busy: boolean;
  /** A server refusal, shown in place rather than behind a closed dialog. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * One confirmation dialog for every way of chasing an unpaid booking, in both
 * portals that can chase one.
 *
 * Everything that differs between the three actions — heading, consequence
 * copy, button label and colour, whether the reason is mandatory, whether a
 * duration is needed — comes from the chase spec. A fourth action is an entry
 * in `paymentWindow.ts` and nothing here.
 *
 * The copy is the point, and it is the reason `ConfirmDialog` is not reused.
 * Cancelling an unpaid booking takes a real date away from a real person who
 * is planning an event around it. The body says what the confirmation causes,
 * including the part that reads well — that no money was ever taken — because
 * an operator who knows there is nothing to refund makes a faster and better
 * decision than one who is guessing.
 */
export function PaymentChaseDialog({
  action,
  reference,
  reason,
  onReasonChange,
  hours,
  onHoursChange,
  busy,
  error,
  onConfirm,
  onCancel,
}: PaymentChaseDialogProps) {
  const spec = action ? paymentChaseSpec(action) : null;
  const needsReason = !!spec?.requiresReason;
  const canSubmit = !busy && (!needsReason || reason.trim().length > 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm();
  }

  return (
    <Dialog
      open={!!action}
      // Blocked while the write is in flight: dismissing mid-request would
      // leave the person unsure whether the booking was cancelled.
      onClose={busy ? undefined : onCancel}
      fullWidth
      maxWidth="xs"
      PaperProps={{ component: 'form', onSubmit: handleSubmit, sx: { borderRadius: 4 } }}
    >
      <DialogContent sx={{ px: { xs: 3, sm: 4 }, pt: 4, pb: 2, textAlign: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <IconBadge accent={spec?.tone ?? 'secondary'} size={64} circular>
            {action ? ICONS[action] : null}
          </IconBadge>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {spec?.title.replace('{ref}', reference ?? '')}
          </Typography>
          <DialogContentText sx={{ color: 'text.secondary', m: 0 }}>
            {spec?.description}
          </DialogContentText>
        </Stack>

        {spec?.needsHours && (
          <TextField
            select
            label="How much longer"
            value={hours}
            onChange={(e) => onHoursChange(Number(e.target.value))}
            fullWidth
            disabled={busy}
            sx={{ mt: 3, textAlign: 'left' }}
            helperText="Counted from now, not from the deadline that was missed."
          >
            {EXTENSION_CHOICES.map((c) => (
              <MenuItem key={c.hours} value={c.hours}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        {spec && (
          <TextField
            label={spec.reasonLabel}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            multiline
            minRows={3}
            required={needsReason}
            fullWidth
            disabled={busy}
            sx={{ mt: 3, textAlign: 'left' }}
            helperText={spec.reasonHelper}
          />
        )}

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
