import {
  ActionNote,
  AdvanceTermsRows,
  Alert,
  Box,
  Divider,
  PaymentTermsNotice,
  SectionCard,
  Stack,
  Typography,
  readPaymentTerms,
} from '@sinnapi/ui';
import HandshakeIcon from '@mui/icons-material/Handshake';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import type { VendorBookingDetailModel } from '@/lib/types';
import type { MoneySectionModel } from '../../hooks/useMoneySection';

type Props = {
  booking: VendorBookingDetailModel;
  escrowSection: MoneySectionModel['escrowSection'];
};

/**
 * What the two sides agreed about the money: how it is paid, and when it
 * moves.
 *
 * These were two cards — "Payment terms" and "Payment schedule" — that each
 * restated the amount the summary above now owns. Together they are one
 * record (the rail, then the timetable that rail runs on) and read better as
 * one card with two parts. The actions still live in the action bar; this
 * card explains, it never acts.
 *
 * The terms notice is shown in full while there is something to decide or it
 * ended badly. Once agreed it shrinks to a single line: the rail is already a
 * chip on the summary, and on a direct booking the summary carries the
 * off-platform warning, so a second full notice would only repeat it.
 *
 * Draws nothing on bookings that predate both payment terms and advance
 * terms.
 */
export default function BookingAgreementCard({ booking, escrowSection }: Props) {
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

  const hasTerms = !!view.rail;
  const hasSchedule = booking.payment_type !== 'direct' && booking.advance_rate !== null;
  if (!hasTerms && !hasSchedule) return null;

  const isAgreed = view.status === 'accepted';
  const awaitingConsent = hasSchedule && !booking.advance_terms_accepted_at;
  const needsAttention = view.isWaitingOnMe || awaitingConsent;
  const { escrow } = escrowSection;

  return (
    <SectionCard
      title="What you agreed"
      icon={<HandshakeIcon />}
      accent={needsAttention ? 'secondary' : 'info'}
      subtitle="Set with the client — not changeable here"
    >
      <Stack spacing={2.5} divider={<Divider flexItem />}>
        {hasTerms && (
          <Box>
            <PartHeading>How you get paid</PartHeading>
            {isAgreed ? (
              <Stack spacing={1}>
                <ActionNote icon={<HowToRegIcon />} tone="success">
                  {view.rail === 'escrow'
                    ? 'Agreed: the client pays through Sinnapi, and we release it to you on the schedule below.'
                    : 'Agreed: the client pays you directly, outside Sinnapi.'}
                </ActionNote>
                {view.note && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    “{view.note}” — the client
                  </Typography>
                )}
                {view.fromEvent && (
                  <Typography variant="caption" color="text.secondary">
                    Set on the client’s event, so it applies to every booking under it.
                  </Typography>
                )}
              </Stack>
            ) : (
              <PaymentTermsNotice view={view} counterpartyLabel="the client" />
            )}
          </Box>
        )}

        {hasSchedule && (
          <Box>
            <PartHeading>When it reaches you</PartHeading>
            {/* Amounts deliberately left out: the summary and the money card
                already state the advance and the balance. The schedule's job is
                the rate, the date, and who consented to it. */}
            <AdvanceTermsRows
              rate={booking.advance_rate}
              daysBefore={booking.advance_release_days_before}
              note={booking.advance_terms_note}
              acceptedAt={booking.advance_terms_accepted_at}
              acceptedLabel="Client accepted"
              advanceDueAt={escrow?.advance_release_due_at}
              currency={escrow?.currency ?? booking.currency}
            />
            {awaitingConsent && (
              <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                The client has not accepted this schedule yet. Until they do, the booking cannot be
                funded — nothing is held for you and nothing can be released.
              </Alert>
            )}
          </Box>
        )}
      </Stack>
    </SectionCard>
  );
}

function PartHeading({ children }: { children: string }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      component="h3"
      sx={{ display: 'block', lineHeight: 1.6, mb: 1 }}
    >
      {children}
    </Typography>
  );
}
