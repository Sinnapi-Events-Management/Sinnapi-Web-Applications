import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  formatAmount,
} from '@sinnapi/ui';
import PaidIcon from '@mui/icons-material/Paid';

type Props = {
  open: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  onSubmit: (note: string) => Promise<boolean>;
  isBusy: boolean;
  error: string | null;
};

/**
 * Asking to be paid, after the event.
 *
 * The figure is stated before anything is sent, and it is the same figure the
 * server derives — the vendor should never find out what they asked for from
 * the receipt. The note is optional but prompted for, because it is the first
 * thing the client reads and "the event went ahead as agreed" answers the
 * question the client is about to be asked.
 *
 * The dialog is also where the vendor learns this is not instant: the client
 * gets to approve it, and may offer less. Saying so here is kinder than
 * letting them discover it when a reduction lands.
 */
export default function SettlementRequestDialog({
  open,
  onClose,
  amount,
  currency,
  onSubmit,
  isBusy,
  error,
}: Props) {
  const [note, setNote] = useState('');

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ask to be paid {formatAmount(amount, currency)}?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            This tells our team the event is done and you want the money we are holding for you. We
            put it to the client to approve. They can approve it in full, or offer less and tell you
            why — and if they offer less, nothing is paid or refunded until you agree to it.
          </Typography>

          <TextField
            autoFocus
            multiline
            minRows={3}
            fullWidth
            label="Anything the client should know (optional)"
            placeholder="e.g. Everything was delivered as agreed, including the extra hour on the night."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isBusy}
            helperText="This is the first thing the client reads before they decide."
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<PaidIcon />}
          disabled={isBusy}
          onClick={async () => {
            if (await onSubmit(note.trim())) onClose();
          }}
        >
          {isBusy ? 'Sending…' : 'Request payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
