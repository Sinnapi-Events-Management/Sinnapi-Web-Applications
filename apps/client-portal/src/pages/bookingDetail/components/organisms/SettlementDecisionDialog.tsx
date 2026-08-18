import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  formatAmount,
} from '@sinnapi/ui';
import { ControlledCheckbox, ControlledField } from '@sinnapi/ui/forms';
import type { SettlementRequestModel } from '@/lib/types';
import { useSettlementDecisionForm } from '../../hooks/useSettlementDecisionForm';
import SettlementDecisionChoice from '../molecules/SettlementDecisionChoice';

type Props = {
  open: boolean;
  onClose: () => void;
  request: SettlementRequestModel;
  onApproveFull: () => Promise<boolean>;
  onApproveReduced: (amount: number, reason: string) => Promise<boolean>;
  isBusy: boolean;
  error: string | null;
};

/**
 * The client deciding what their vendor is paid.
 *
 * Layout only — `useSettlementDecisionForm` owns the state and the rules. What
 * this arranges is the order the decision is made in: choose the answer, then
 * (only if it is a reduction) the amount and the reason, then consent to the
 * figure with it visible on the same screen.
 *
 * The consent line names the number rather than pointing at "the above". A
 * tick against a figure the person had to scroll to find is the version of
 * this that does not hold up.
 */
export default function SettlementDecisionDialog({
  open,
  onClose,
  request,
  onApproveFull,
  onApproveReduced,
  isBusy,
  error,
}: Props) {
  const requested = Number(request.requested_amount ?? 0);
  const currency = request.currency ?? 'UGX';

  const { form, decision, isReduced, withheld, setDecision, submit } = useSettlementDecisionForm({
    requested,
    onApproveFull: async () => {
      const ok = await onApproveFull();
      if (ok) onClose();
      return ok;
    },
    onApproveReduced: async (amount, reason) => {
      const ok = await onApproveReduced(amount, reason);
      if (ok) onClose();
      return ok;
    },
  });

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>How much should your vendor be paid?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Your event is done and we are holding {formatAmount(requested, currency)} for your
            vendor. Nothing has been paid to them yet.
          </Typography>

          <SettlementDecisionChoice
            value={decision}
            onChange={setDecision}
            requested={requested}
            currency={currency}
            disabled={isBusy}
          />

          {isReduced && (
            <>
              <ControlledField
                name="amount"
                control={form.control}
                label={`Amount to pay (${currency})`}
                placeholder="e.g. 250000"
                disabled={isBusy}
                helperText={
                  withheld != null
                    ? `${formatAmount(withheld, currency)} would come back to you.`
                    : `Less than ${formatAmount(requested, currency)}.`
                }
              />

              <ControlledField
                name="reason"
                control={form.control}
                label="Why are you paying less?"
                placeholder="Be specific — what was agreed, and what happened on the day."
                multiline
                minRows={3}
                disabled={isBusy}
                helperText="Your vendor reads this and can accept it or contest it."
              />
            </>
          )}

          <ControlledCheckbox
            name="consent"
            control={form.control}
            disabled={isBusy}
            label={
              <Typography variant="body2">
                I agree to Sinnapi paying my vendor{' '}
                <strong>
                  {formatAmount(
                    isReduced && withheld != null ? requested - withheld : requested,
                    currency,
                  )}
                </strong>{' '}
                for this booking
                {isReduced
                  ? ', and I understand the vendor has to accept this before anything is paid or refunded.'
                  : ', in full and final settlement of it.'}
              </Typography>
            }
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button variant="contained" color="success" disabled={isBusy} onClick={submit}>
          {isBusy ? 'Submitting…' : isReduced ? 'Send this to the vendor' : 'Approve payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
