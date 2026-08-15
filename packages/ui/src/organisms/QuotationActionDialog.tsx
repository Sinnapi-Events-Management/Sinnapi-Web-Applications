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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BlockIcon from '@mui/icons-material/Block';
import UndoIcon from '@mui/icons-material/Undo';
import { IconBadge } from '../molecules/IconBadge';
import { quotationActionSpec, type QuotationAction } from '../molecules/quotationTransitions';

const ICONS: Record<QuotationAction, ReactNode> = {
  accept: <CheckCircleOutlineIcon />,
  revise: <EditNoteIcon />,
  void: <BlockIcon />,
  withdraw: <UndoIcon />,
};

export type QuotationActionDialogProps = {
  /** The action awaiting confirmation, or `null` when the dialog is closed. */
  action: QuotationAction | null;
  /** Quotation reference, woven into the heading so the modal names its subject. */
  reference?: string | null;
  /** Reason text. Owned by the caller's hook — this component holds no state. */
  reason: string;
  onReasonChange: (value: string) => void;
  busy: boolean;
  /** A server refusal, shown in place rather than behind a closed dialog. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * One confirmation dialog for every quotation status write, in both portals.
 *
 * Everything that differs between the four actions — heading, consequence copy,
 * button label, colour, whether a reason is required — comes from the action
 * spec, so a fifth transition is a new entry in `quotationTransitions.ts` and
 * nothing here.
 *
 * The copy is the point. Accepting binds a price and opens a payment step;
 * voiding ends the thread for the other party. The body says what the
 * confirmation will *cause*, never "are you sure".
 */
export function QuotationActionDialog({
  action,
  reference,
  reason,
  onReasonChange,
  busy,
  error,
  onConfirm,
  onCancel,
}: QuotationActionDialogProps) {
  const spec = action ? quotationActionSpec(action) : null;
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
      // leave the person unsure whether their quotation changed.
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
            inputProps={{ maxLength: 500 }}
            sx={{ mt: 3, textAlign: 'left' }}
            helperText={spec?.reasonHelperText}
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
