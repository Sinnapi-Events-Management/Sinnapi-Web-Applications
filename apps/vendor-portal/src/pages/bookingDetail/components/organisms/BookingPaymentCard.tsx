import {
  Alert,
  PaymentChaseDialog,
  PaymentDeadline,
  QueryState,
  SectionCard,
  Stack,
} from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShieldIcon from '@mui/icons-material/Shield';
import type { VendorBookingDetailModel } from '@/lib/types';
import type { MoneySectionModel } from '../../hooks/useMoneySection';
import { usePaymentChase } from '../../hooks/usePaymentChase';
import EscrowStateSummary from '../molecules/EscrowStateSummary';
import PaymentChaseActions from '../molecules/PaymentChaseActions';

type Props = {
  booking: VendorBookingDetailModel;
  /** Read once by `useMoneySection` and shared with the summary above. */
  section: MoneySectionModel['escrowSection'];
};

/**
 * What this booking is worth, where that money currently is, and — when it is
 * not anywhere — what the vendor can do about it.
 *
 * The escrow half stays read-only and always will: funding, disputes and
 * release confirmation belong to the client or an operator. What is new is the
 * half below it. "The client has not paid" used to be a sentence with no verb
 * attached — the vendor could see it and do nothing about it, while the date
 * stayed off their calendar indefinitely. Now the same state carries a
 * deadline, a reminder, and once that deadline has passed, the decision about
 * their own date.
 *
 * The amount and the escrow status chip now live on the summary card above,
 * which is why neither is repeated here: this card is the *story* of the
 * money (the journey, the split, the deadline), not its headline. A direct
 * booking has no story to tell — Sinnapi never holds that money — so the card
 * draws nothing and the summary carries the one off-platform warning.
 *
 * Layout only. `useMoneySection` decides where the money is and
 * `usePaymentChase` owns the clock and the two writes.
 */
export default function BookingPaymentCard({ booking, section }: Props) {
  const chase = usePaymentChase(booking);
  const { escrow } = section;

  if (section.isOffPlatform) return null;

  return (
    <SectionCard
      title="Where your money is"
      icon={section.isFunded ? <ShieldIcon /> : <PaymentsIcon />}
      accent={section.isFunded ? 'success' : 'secondary'}
      subtitle={section.isFunded ? 'Held safely by Sinnapi' : 'Waiting for the client to pay'}
    >
      <Stack spacing={2.5}>
        <QueryState isLoading={section.isLoading} error={section.error}>
          {escrow && section.isFunded ? (
            <EscrowStateSummary
              escrow={escrow}
              advanceReleased={section.advanceReleased}
              isFrozen={section.isFrozen}
              isSettled={section.isSettled}
            />
          ) : (
            /* Unfunded. The deadline block carries the whole story — how
                 long the client has, whether they are late, and the controls —
                 so the old "not funded yet" notice would now be saying the
                 same thing twice. It stays only for the case the clock has
                 nothing to say about: terms still unsettled, so no window has
                 opened and there is genuinely nothing to chase yet. */
            <PaymentDeadline booking={booking} audience="vendor">
              {chase.error && <Alert severity="error">{chase.error}</Alert>}
              <PaymentChaseActions
                actions={chase.actions}
                onSelect={chase.open}
                disabled={chase.isBusy}
              />
            </PaymentDeadline>
          )}

          {!section.isFunded && chase.window.state === 'not_applicable' && (
            <Alert severity="info">
              The client has not funded this booking yet. The payment clock starts once you have
              agreed the terms and they have accepted the payment schedule — you will see the money
              here the moment it lands.
            </Alert>
          )}
        </QueryState>
      </Stack>

      <PaymentChaseDialog
        action={chase.pending}
        reference={booking.reference_no}
        reason={chase.reason}
        onReasonChange={chase.setReason}
        // The vendor is never offered the extension action, so the duration is
        // never read. Passed as a constant rather than threaded through state
        // that would only ever hold one value.
        hours={24}
        onHoursChange={() => {}}
        busy={chase.isBusy}
        error={chase.error}
        onConfirm={chase.confirm}
        onCancel={chase.close}
      />
    </SectionCard>
  );
}
