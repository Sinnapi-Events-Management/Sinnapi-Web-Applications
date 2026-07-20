import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import IconBadge from './IconBadge';

type ConfirmColor = 'primary' | 'secondary' | 'error' | 'success';

type Props = {
  open: boolean;
  title: string;
  /** Explains what the action does — say the consequence, not just "are you sure". */
  message: React.ReactNode;
  confirmLabel: string;
  confirmColor?: ConfirmColor;
  /** Glyph for the header badge; falls back to a sensible icon per confirmColor. */
  icon?: React.ReactNode;
  busy?: boolean;
  /** Require a free-text justification before the action can be confirmed. */
  requireReason?: boolean;
  reasonLabel?: string;
  onClose: () => void;
  /** Receives the typed reason, or '' when `requireReason` is off. */
  onConfirm: (reason: string) => void;
};

/** Default badge glyph when a caller doesn't supply its own. */
const FALLBACK_ICON: Record<ConfirmColor, React.ReactNode> = {
  error: <WarningAmberRoundedIcon />,
  success: <CheckCircleOutlineRoundedIcon />,
  primary: <HelpOutlineRoundedIcon />,
  secondary: <HelpOutlineRoundedIcon />,
};

/**
 * Generic confirmation for a destructive or otherwise irreversible action.
 * Presentation only — the caller owns the action and its in-flight state.
 *
 * Centered icon-led layout: a tinted badge (colour derived from `confirmColor`)
 * anchors the intent, with the consequence spelled out below and the primary
 * action given prominence. The dialog unmounts when closed, so the reason field
 * resets between opens.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor = 'secondary',
  icon,
  busy = false,
  requireReason = false,
  reasonLabel = 'Reason',
  onClose,
  onConfirm,
}: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = requireReason
      ? String(new FormData(e.currentTarget).get('reason') ?? '').trim()
      : '';
    onConfirm(reason);
  }

  return (
    <Dialog
      open={open}
      // Block backdrop/escape dismissal while the action is in flight.
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(6px)' } } }}
      PaperProps={{ component: 'form', onSubmit: handleSubmit, sx: { borderRadius: 4 } }}
    >
      <DialogContent sx={{ px: { xs: 3, sm: 4 }, pt: 4, pb: 2, textAlign: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <IconBadge accent={confirmColor} size={64} circular>
            {icon ?? FALLBACK_ICON[confirmColor]}
          </IconBadge>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {title}
          </Typography>
          <DialogContentText sx={{ color: 'text.secondary', m: 0 }}>{message}</DialogContentText>
        </Stack>

        {requireReason && (
          <TextField
            name="reason"
            label={reasonLabel}
            multiline
            minRows={3}
            required
            autoFocus
            fullWidth
            disabled={busy}
            sx={{ mt: 3, textAlign: 'left' }}
          />
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
          color="error"
          onClick={onClose}
          disabled={busy}
          sx={{ m: 0 }}
        >
          Cancel
        </Button>
        <Button
          fullWidth
          type="submit"
          color={confirmColor}
          variant="contained"
          disableElevation
          disabled={busy}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ m: 0 }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
