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
import SendIcon from '@mui/icons-material/Send';

type Props = {
  open: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  vendorNote: string | null;
  onSubmit: (note: string) => Promise<boolean>;
  isBusy: boolean;
  error: string | null;
};

/**
 * Putting the vendor's request to the client.
 *
 * The operator is not approving anything here — they are asking a question on
 * the vendor's behalf and starting the client's clock. The dialog says so,
 * because "forward" beside a money figure reads like an approval to someone
 * moving quickly through a queue.
 *
 * The note is optional and goes to the client as context. It is the place for
 * "we have checked with the vendor and the event did go ahead" — the sort of
 * thing that turns a cold request into one a client answers the same day.
 */
export default function SettlementForwardDialog({
  open,
  onClose,
  amount,
  currency,
  vendorNote,
  onSubmit,
  isBusy,
  error,
}: Props) {
  const [note, setNote] = useState('');

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ask the client to approve {formatAmount(amount, currency)}?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            The client is asked to approve this in full or offer less with a reason. Nothing moves
            on your say-so here — this only starts their clock. If they do not answer within the
            window, the request comes back to this console as a full-amount release for a human to
            approve.
          </Typography>

          {vendorNote && (
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                What the vendor said
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  pl: 1.5,
                  borderLeft: '3px solid',
                  borderColor: 'divider',
                  fontStyle: 'italic',
                }}
              >
                {vendorNote}
              </Typography>
            </Stack>
          )}

          <TextField
            autoFocus
            multiline
            minRows={2}
            fullWidth
            label="Note to the client (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isBusy}
            helperText="Shown to the client and the vendor, and kept on the record."
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
          startIcon={<SendIcon />}
          disabled={isBusy}
          onClick={async () => {
            if (await onSubmit(note.trim())) onClose();
          }}
        >
          {isBusy ? 'Sending…' : 'Send to client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
