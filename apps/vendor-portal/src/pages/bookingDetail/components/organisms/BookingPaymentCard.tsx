import {
  Alert,
  PaymentChaseDialog,
  PaymentDeadline,
  QueryState,
  SectionCard,
  Stack,
  StatusChip,
} from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShieldIcon from '@mui/icons-material/Shield';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useBookingEscrow } from '../../hooks/useBookingEscrow';
import { usePaymentChase } from '../../hooks/usePaymentChase';
import AmountHeadline from '../molecules/AmountHeadline';
import EscrowStateSummary from '../molecules/EscrowStateSummary';
import PaymentChaseActions from '../molecules/PaymentChaseActions';

type Props = { booking: VendorBookingDetailModel };

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
 * Layout only. `useBookingEscrow` decides where the money is and
 * `usePaymentChase` owns the clock and the two writes.
 */
export default function BookingPaymentCard({ booking }: Props) {
  const section = useBookingEscrow(booking);
  const chase = usePaymentChase(booking);
  const { escrow } = section;

  return (
    <SectionCard
      title="Payment"
      icon={section.isFunded ? <ShieldIcon /> : <PaymentsIcon />}
      accent={section.isFunded ? 'success' : 'secondary'}
      action={escrow ? <StatusChip status={escrow.status} /> : undefined}
    >
      <Stack spacing={2.5}>
        <AmountHeadline
          amount={booking.amount}
          currency={booking.currency}
          paymentType={booking.payment_type}
        />

        {/* A direct booking has no escrow to show and never will. Saying so is
            better than a card that silently offers nothing: it is also the
            line that decides whether Sinnapi can help if the client does not
            pay, which a vendor should read before the event, not after. */}
        {section.isOffPlatform ? (
          <Alert severity="warning">
            This booking is settled directly between you and the client. Sinnapi is not holding this
            money and cannot release, refund or chase it — collect it however the two of you
            arranged.
          </Alert>
        ) : (
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
                agreed the terms and they have accepted the payment schedule — you will see the
                money here the moment it lands.
              </Alert>
            )}
          </QueryState>
        )}
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
