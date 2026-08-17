import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  PaymentTermsBreakdown,
  Stack,
  Typography,
  paymentRailSpec,
} from '@sinnapi/ui';
import AdvanceScheduleField from '@/components/paymentTerms/components/molecules/AdvanceScheduleField';
import type { BookingDetailModel } from '@/lib/types';
import type { useTermsCounter } from '../../hooks/useTermsCounter';

type Props = {
  booking: BookingDetailModel;
  counter: ReturnType<typeof useTermsCounter>;
};

/**
 * The vendor's counter-proposal, and the client's answer to it.
 *
 * What is on screen is the rail the *vendor* wants, priced — not a choice
 * between two. The client's options are to take it or to end the booking, and
 * the dialog says the second one out loud rather than dressing it as "cancel":
 * declining a counter declines the booking, and a client who thinks they are
 * closing a dialog should not lose their date by it.
 *
 * Layout only. `useTermsCounter` owns the writes, and the advance consent it
 * requires when the counter moves the booking onto the escrow rail.
 */
export default function TermsCounterDialog({ booking, counter }: Props) {
  const spec = paymentRailSpec(counter.counter);

  return (
    <Dialog
      open={counter.open}
      onClose={counter.busy ? undefined : () => counter.setOpen(false)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Your vendor proposed: {spec.label.toLowerCase()}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {counter.error && <Alert severity="error">{counter.error}</Alert>}

          {counter.view.note && (
            <Alert severity="info" icon={false}>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                “{counter.view.note}” — your vendor
              </Typography>
            </Alert>
          )}

          {counter.isTowardsEscrow ? (
            <>
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={700}>
                  What you would pay
                </Typography>
                <PaymentTermsBreakdown
                  preview={counter.choice.preview}
                  rail="escrow"
                  advanceDaysBefore={booking.advance_release_days_before}
                  isLoading={counter.choice.isLoadingPreview}
                  isPricing={counter.choice.isPricing}
                  unavailableReason={counter.choice.unavailableReason}
                />
              </Stack>

              {/* Moving onto escrow introduces a payout schedule this client has
                  never agreed to. The server refuses the accept without it —
                  and without a priced preview there is no schedule to put in
                  front of them, so the control waits for one rather than asking
                  for consent to figures nobody has. */}
              {counter.choice.preview && (
                <AdvanceScheduleField
                  choice={counter.choice}
                  disabled={counter.busy}
                  daysBefore={booking.advance_release_days_before}
                />
              )}
            </>
          ) : (
            <Alert severity="warning">
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                You would be paying your vendor directly, outside Sinnapi.
              </Typography>
              <Typography variant="body2">
                Sinnapi would hold none of this money. If the vendor does not deliver, or you are
                unhappy with the work, we cannot refund you and we cannot mediate. Anything you have
                already agreed about releasing money early no longer applies — there is nothing for
                us to release.
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={() => counter.setOpen(false)} disabled={counter.busy}>
          Decide later
        </Button>
        {/* Named for what it does. "Cancel" here would end the booking. */}
        <Button color="error" onClick={counter.decline} disabled={counter.busy}>
          Decline and end booking
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={counter.accept}
          disabled={!counter.canAccept}
        >
          {counter.busy ? 'Saving…' : 'Accept these terms'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
