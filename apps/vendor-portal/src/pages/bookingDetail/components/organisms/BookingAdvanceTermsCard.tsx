import { AdvanceTermsRows, Alert, SectionCard } from '@sinnapi/ui';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useBookingEscrow } from '../../hooks/useBookingEscrow';

type Props = { booking: VendorBookingDetailModel };

/**
 * When the vendor gets paid, and how much of it arrives before the event.
 *
 * Separate from the payment card above it on purpose. That card is about
 * money that has moved; this one is about the schedule it moves on — which
 * exists, and matters, before a shilling has been funded. A vendor deciding
 * whether to accept a booking is deciding whether they can float the work
 * until the balance clears, and that decision needs the rate and the release
 * date, not the current escrow status.
 *
 * The consent stamp is the other half. Escrow cannot be funded until the
 * client accepts these terms, so an unaccepted schedule is the reason a
 * booking sits unfunded — and the vendor is the party most likely to notice
 * and chase it.
 *
 * Absent on direct bookings, which have no schedule because Sinnapi holds
 * nothing, and on bookings that predate advance terms entirely.
 */
export default function BookingAdvanceTermsCard({ booking }: Props) {
  const { escrow } = useBookingEscrow(booking);

  const hasSchedule = booking.advance_rate !== null;
  if (booking.payment_type === 'direct' || !hasSchedule) return null;

  const awaitingConsent = !booking.advance_terms_accepted_at;

  return (
    <SectionCard
      title="Payment schedule"
      icon={<ScheduleSendIcon />}
      accent={awaitingConsent ? 'info' : 'secondary'}
      subtitle="Agreed with the client, not changeable here"
    >
      <AdvanceTermsRows
        rate={booking.advance_rate}
        daysBefore={booking.advance_release_days_before}
        note={booking.advance_terms_note}
        acceptedAt={booking.advance_terms_accepted_at}
        acceptedLabel="Client accepted"
        // Once escrow exists these are the real figures and the real date,
        // rather than a percentage the reader has to apply themselves.
        advanceDueAt={escrow?.advance_release_due_at}
        advanceAmount={escrow?.advance_amount}
        balanceAmount={escrow?.balance_amount}
        currency={escrow?.currency ?? booking.currency}
      />

      {awaitingConsent && (
        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          The client has not accepted this schedule yet. Until they do, the booking cannot be funded
          — nothing is held for you and nothing can be released.
        </Alert>
      )}
    </SectionCard>
  );
}
