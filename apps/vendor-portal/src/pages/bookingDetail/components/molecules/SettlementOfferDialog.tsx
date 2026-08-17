import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
  formatAmount,
} from '@sinnapi/ui';

const MIN_OBJECTION = 20;

export type OfferMode = 'accept' | 'contest';

type Props = {
  mode: OfferMode;
  open: boolean;
  onClose: () => void;
  offered: number;
  requested: number;
  currency: string;
  clientReason: string | null;
  onSubmit: (note: string) => Promise<boolean>;
  isBusy: boolean;
  error: string | null;
};

/**
 * The vendor's answer to a reduced offer — the consent step, and the one that
 * makes the reduced figure payable at all.
 *
 * Two modes rather than two components: they ask for the same thing from the
 * same state, differing in what the words commit the vendor to. Splitting them
 * would mean two copies of the figures, and figures that can drift between two
 * dialogs describing one decision are exactly the risk this flow exists to
 * remove.
 *
 * Accepting requires a tick, not just a click. The vendor is agreeing to be
 * paid less than they invoiced and that agreement is what Sinnapi will point
 * at if the amount is ever questioned — so it is taken explicitly, with the
 * figure and the shortfall visible in the same breath.
 */
export default function SettlementOfferDialog({
  mode,
  open,
  onClose,
  offered,
  requested,
  currency,
  clientReason,
  onSubmit,
  isBusy,
  error,
}: Props) {
  const [note, setNote] = useState('');
  const [consented, setConsented] = useState(false);

  const isContest = mode === 'contest';
  const shortfall = Math.max(requested - offered, 0);
  const tooShort = note.trim().length < MIN_OBJECTION;
  const disabled = isBusy || (isContest ? tooShort : !consented);

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isContest
          ? 'Contest the amount offered?'
          : `Accept ${formatAmount(offered, currency)} for this booking?`}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            You asked for {formatAmount(requested, currency)}. The client has offered{' '}
            {formatAmount(offered, currency)}, which is {formatAmount(shortfall, currency)} less.
          </Typography>

          {clientReason && (
            <Typography
              variant="body2"
              sx={{ pl: 1.5, borderLeft: '3px solid', borderColor: 'divider', fontStyle: 'italic' }}
            >
              {clientReason}
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary">
            {isContest
              ? 'We will freeze the money and put this in front of our team, who will look at what ' +
                'both of you have said before anything moves. Give them what they need to decide.'
              : 'Accepting settles this booking at the lower figure. The difference goes back to ' +
                'the client and neither amount can be revisited afterwards.'}
          </Typography>

          <TextField
            autoFocus
            multiline
            minRows={isContest ? 4 : 2}
            fullWidth
            label={isContest ? 'Why do you not accept this?' : 'Anything to add (optional)'}
            placeholder={
              isContest
                ? 'What was agreed, what you delivered, and anything that supports it — messages, ' +
                  'photos, the signed brief.'
                : ''
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isBusy}
            error={isContest && note.length > 0 && tooShort}
            helperText={
              isContest && note.length > 0 && tooShort
                ? `Please add a little more detail (${MIN_OBJECTION - note.trim().length} more characters).`
                : isContest
                  ? 'The client sees this, and so does the person reviewing it.'
                  : 'The client sees this.'
            }
          />

          {!isContest && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  disabled={isBusy}
                />
              }
              label={
                <Typography variant="body2">
                  I agree to be paid {formatAmount(offered, currency)} in full and final settlement
                  of this booking, and to {formatAmount(shortfall, currency)} being returned to the
                  client.
                </Typography>
              }
            />
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={isContest ? 'error' : 'success'}
          disabled={disabled}
          onClick={async () => {
            if (await onSubmit(note.trim())) onClose();
          }}
        >
          {isBusy ? 'Submitting…' : isContest ? 'Contest this amount' : 'Accept and settle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
