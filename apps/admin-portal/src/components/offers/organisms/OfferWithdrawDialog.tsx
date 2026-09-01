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
} from '@sinnapi/ui';
import type { AdminOfferModel } from '@/lib/types';
import type { PendingSuspension } from '../hooks/useOfferModerationFlow';

type Props = {
  pending: PendingSuspension;
  reason: string;
  onReasonChange: (value: string) => void;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The longest reason the RPC will accept, so the field can say so before the server does. */
const MAX_REASON = 500;

/**
 * Taking an offer off the market, with the reason on the record.
 *
 * ITS OWN DIALOG RATHER THAN `ConfirmDialog`
 * That component renders its description inside a `DialogContentText`, which is
 * a `<p>` — and a `<p>` containing a `<TextField>` is invalid markup that
 * browsers silently reflow. This needs a text input, so it is its own dialog.
 *
 * THE REASON IS MANDATORY AND THE COPY SAYS WHY
 * `admin_set_discount_suspended` refuses without one, and the reason is not
 * paperwork: it is written to the row, sent to the vendor in the notification
 * they receive, and is the only defence the platform has when that vendor asks
 * why their campaign was pulled off a public page. So the field explains that
 * it will be shown to them, before it is typed rather than after.
 *
 * The consequence is stated in full, and it differs by row. Withdrawing a code
 * under a campaign takes the whole campaign — banner and every other code —
 * off the market, because `discount_is_live` tests the campaign. An operator
 * who meant to pull one code needs to know that before they confirm, not from
 * the vendor's reply afterwards.
 *
 * What it does NOT do is reach into deals already struck. Quotes already sent
 * under the offer keep their price; that is a promise the vendor made and the
 * client may already have accepted, and the dialog says so — otherwise an
 * operator hesitates over a take-down for fear of unwinding live bookings.
 */
export default function OfferWithdrawDialog({
  pending,
  reason,
  onReasonChange,
  busy,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const offer: AdminOfferModel | undefined = pending?.offer;
  const wholeCampaign = Boolean(offer?.promotion_id);
  const tooLong = reason.length > MAX_REASON;
  const canConfirm = reason.trim().length > 0 && !tooLong && !busy;

  return (
    <Dialog open={pending !== null} onClose={busy ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Withdraw &ldquo;{offer?.title}&rdquo;</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" color="text.secondary">
            {wholeCampaign ? (
              <>
                This code belongs to the <strong>{offer?.promotion_title}</strong> campaign.
                Withdrawing it takes the whole campaign off the market — its banner and every other
                code under it stop being shown to clients.
              </>
            ) : (
              <>
                Clients will stop seeing this offer immediately. It will no longer appear on{' '}
                {offer?.vendor_name ?? 'the vendor'}&rsquo;s profile, on their package cards or in
                the public offers directory.
              </>
            )}
          </Typography>

          <Alert severity="info" sx={{ py: 0.5 }}>
            Quotes already sent under this offer keep their price. This stops it being handed out
            again; it does not reach back into a deal that was already struck.
          </Alert>

          <TextField
            label="Reason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            multiline
            minRows={3}
            autoFocus
            required
            disabled={busy}
            error={tooLong}
            helperText={
              tooLong
                ? `Keep the reason under ${MAX_REASON} characters.`
                : `Sent to ${offer?.vendor_name ?? 'the vendor'} and kept on the record. Write it for them to read.`
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!canConfirm} color="error" variant="contained">
          {busy ? 'Withdrawing…' : wholeCampaign ? 'Withdraw campaign' : 'Withdraw offer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
