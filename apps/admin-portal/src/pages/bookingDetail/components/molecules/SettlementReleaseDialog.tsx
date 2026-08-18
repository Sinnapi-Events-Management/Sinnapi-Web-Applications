import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MoneyBreakdown,
  Stack,
  Typography,
} from '@sinnapi/ui';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import type { SettlementRequestModel } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  request: SettlementRequestModel;
  onSubmit: () => Promise<boolean>;
  isBusy: boolean;
  error: string | null;
};

/**
 * Releasing the figure the parties agreed.
 *
 * The console operator has no discretion here and the dialog is built to make
 * that obvious: the amounts are shown, not editable. What the vendor is paid
 * was decided by the client and consented to by the vendor, and an operator
 * adjusting it at the last step would be paying out a number nobody agreed to
 * — which is precisely the exposure this whole flow exists to close.
 *
 * The consequences are spelled out because they are two writes, not one: a
 * payout for the vendor and, where the client withheld something, a refund
 * raised in their name for Finance to approve and settle separately.
 */
export default function SettlementReleaseDialog({
  open,
  onClose,
  request,
  onSubmit,
  isBusy,
  error,
}: Props) {
  const currency = request.currency ?? 'UGX';
  const requested = Number(request.requested_amount ?? 0);
  const approved = Number(request.approved_amount ?? 0);
  const withheld = Math.max(requested - approved, 0);

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Release the agreed settlement?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <MoneyBreakdown
            currency={currency}
            lines={[
              { label: 'Vendor asked for', amount: requested },
              ...(withheld > 0
                ? [{ label: 'Withheld by agreement', amount: withheld, muted: true }]
                : []),
            ]}
            total={{ label: 'Paying the vendor', amount: approved }}
          />

          <Typography variant="body2" color="text.secondary">
            {withheld > 0
              ? 'This raises a payout for the vendor at the agreed figure and a refund to the ' +
                'client for the difference. The refund still needs approving and settling in the ' +
                'refunds queue — releasing here does not send it.'
              : 'This raises the balance payout for the vendor. It still needs settling with a ' +
                'reference and proof, and a second admin has to approve that settlement.'}
          </Typography>

          {request.decided_automatically && (
            <Alert severity="warning">
              The client never responded — this was recorded as a full approval when their window
              expired. Check there is no open complaint on this booking before releasing.
            </Alert>
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
          color="success"
          startIcon={<AccountBalanceIcon />}
          disabled={isBusy}
          onClick={async () => {
            if (await onSubmit()) onClose();
          }}
        >
          {isBusy ? 'Releasing…' : 'Release settlement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
