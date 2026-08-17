import {
  MoneyBreakdown,
  PaymentTermsNotice,
  SectionCard,
  Stack,
  Typography,
  paymentRailSpec,
  readPaymentTerms,
} from '@sinnapi/ui';
import HandshakeIcon from '@mui/icons-material/Handshake';
import type { VendorBookingDetailModel } from '@/lib/types';

type Props = { booking: VendorBookingDetailModel };

/**
 * The payment terms the client proposed, from the vendor's side.
 *
 * The vendor's accept button now agrees to two things — the date and the rail —
 * and this is where the second one is explained. What matters to a vendor is
 * not the client's fee (they do not pay it) but what they receive and when, so
 * the breakdown here is the vendor's side of the same money: the full agreed
 * amount either way, split into what arrives before the event and what waits on
 * the client's confirmation.
 *
 * The actions live next door in `BookingActionsCard`, which already owns every
 * status write on this page. This card explains; that one acts.
 */
export default function BookingTermsCard({ booking }: Props) {
  const view = readPaymentTerms(
    {
      payment_type: booking.payment_type,
      payment_terms_status: booking.payment_terms_status,
      payment_terms_counter: booking.payment_terms_counter,
      payment_terms_note: booking.payment_terms_note,
      payment_terms_from_event: booking.payment_terms_from_event,
      status: booking.status,
    },
    'vendor',
  );

  // Every booking made before payment terms existed has no rail on it. There is
  // nothing to explain, and an empty card explaining nothing is worse than none.
  if (!view.rail) return null;

  const spec = paymentRailSpec(view.rail);

  return (
    <SectionCard
      title="Payment terms"
      icon={<HandshakeIcon />}
      accent={view.isWaitingOnMe ? 'secondary' : 'info'}
    >
      <Stack spacing={2}>
        <PaymentTermsNotice view={view} counterpartyLabel="the client" />

        <Typography variant="body2" color="text.secondary">
          {spec.vendorNote}
        </Typography>

        {/* What the vendor is owed, which is the agreed amount on either rail —
            Sinnapi's fee is charged to the client on top and never comes out of
            this. Stating it as a line rather than leaving it implied is the
            point: a vendor who assumes escrow costs them a percentage is a
            vendor who counters for the wrong reason. */}
        <MoneyBreakdown
          dense
          currency={booking.currency ?? 'UGX'}
          lines={[
            {
              label: 'Agreed with the client',
              amount: booking.amount,
              hint:
                view.rail === 'escrow'
                  ? 'What you receive in full. Sinnapi’s service fee is added on top and paid ' +
                    'by the client — it is not deducted from this.'
                  : 'What the client pays you directly. Sinnapi takes no part in this payment.',
            },
          ]}
        />
      </Stack>
    </SectionCard>
  );
}
