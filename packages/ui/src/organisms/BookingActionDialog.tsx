'use client';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { IconBadge } from '../molecules/IconBadge';
import { bookingActionSpec, type BookingAction } from '../molecules/bookingTransitions';

const ICONS: Record<BookingAction, ReactNode> = {
  start: <PlayCircleOutlineIcon />,
  accept: <CheckCircleOutlineIcon />,
  counter: <SwapHorizIcon />,
  decline: <CancelOutlinedIcon />,
  complete: <TaskAltIcon />,
};

export type BookingActionDialogProps = {
  /** The action awaiting confirmation, or `null` when the dialog is closed. */
  action: BookingAction | null;
  /** Booking reference, woven into the heading so the modal names its subject. */
  reference?: string | null;
  /** Reason text. Owned by the caller's hook — this component holds no state. */
  reason: string;
  onReasonChange: (value: string) => void;
  busy: boolean;
  /** A server refusal, shown in place rather than behind a closed dialog. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * A control the action needs and the others do not — the payment rail on a
   * counter-proposal. Sits above the reason field, because on that action the
   * reason explains the choice made here.
   *
   * A slot rather than a prop per action: the alternative is this dialog
   * importing a picker it only sometimes renders, which is how one shared
   * confirmation turns into a switch over every transition in the product.
   */
  extra?: ReactNode;
  /**
   * Blocks confirmation on top of the reason rule — a counter with no rail
   * chosen is not submittable however much prose is attached to it.
   */
  disableConfirm?: boolean;
};

/**
 * One confirmation dialog for every booking status write, in every portal.
 *
 * Everything that differs between the five actions — heading, consequence copy,
 * button label, colour, whether a reason is required — comes from the action
 * spec, so a sixth transition is a new entry in `bookingTransitions.ts` and
 * nothing here.
 *
 * `ConfirmDialog` was not reused despite the overlap: decline and cancel need a
 * reason field, and pushing that into the shared confirmation would give every
 * other dialog in the console a control it has no use for.
 *
 * The copy is the point. A booking status change moves money and obligations —
 * completing a booking opens the escrow release window — so the body says what
 * the confirmation will *cause*, never "are you sure". Presentation only: the
 * action, its in-flight state and the reason all belong to the caller's hook.
 */
export function BookingActionDialog({
  action,
  reference,
  reason,
  onReasonChange,
  busy,
  error,
  onConfirm,
  onCancel,
  extra,
  disableConfirm,
}: BookingActionDialogProps) {
  const spec = action ? bookingActionSpec(action) : null;
  const needsReason = !!spec?.requiresReason;
  const canSubmit = !busy && !disableConfirm && (!needsReason || reason.trim().length > 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm();
  }

  return (
    <Dialog
      open={!!action}
      // Blocked while the write is in flight: dismissing mid-request would
      // leave the person unsure whether their booking changed.
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

        {extra && <Box sx={{ mt: 3, textAlign: 'left' }}>{extra}</Box>}

        {needsReason && (
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
            helperText="Shared with the other party and kept on the booking's record."
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
