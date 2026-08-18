import { Alert, InfoRow, PaymentTermsChip, Stack, Typography } from '@sinnapi/ui';
import { formatDateTime } from '@/lib/config';
import type { BookingAdminModel } from '@/lib/types';

type Props = { booking: BookingAdminModel };

/**
 * Which rail was agreed, by whom, and when.
 *
 * The console's version of this is deliberately a record rather than an
 * explanation: an operator opening a booking is reconstructing what happened,
 * not deciding anything. So it states the facts in the order a dispute is
 * argued in — what was proposed, whether it was answered, what was said, and
 * whether either party could have chosen at all.
 *
 * The off-platform warning is the one piece of interpretation, and it earns its
 * place: it is the single fact that decides whether Sinnapi has any money to
 * refund, and an operator promising a refund on a booking we never held is the
 * expensive version of this page being unclear.
 */
export default function PaymentTermsSummary({ booking: b }: Props) {
  const isOffPlatform = b.payment_type === 'direct';
  const isAgreed = b.payment_terms_status === 'accepted';

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        Payment terms
      </Typography>

      <InfoRow
        label="Rail"
        value={<PaymentTermsChip rail={b.payment_type} status={b.payment_terms_status} />}
      />
      <InfoRow label="Status" value={statusLabel(b.payment_terms_status)} />
      {b.payment_terms_counter && (
        <InfoRow label="Vendor counter-proposed" value={b.payment_terms_counter} />
      )}
      <InfoRow label="Answered" value={formatDateTime(b.payment_terms_responded_at)} />
      {b.payment_terms_from_event && (
        <InfoRow
          label="Set by event"
          value={b.event?.title ?? 'Yes'}
          // Worth calling out rather than showing as a bare boolean: it is why
          // the vendor had no counter option, which is the first thing a vendor
          // complains about on a booking they did not want these terms on.
        />
      )}
      {b.payment_terms_note && (
        <InfoRow
          label="Note"
          value={
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              “{b.payment_terms_note}”
            </Typography>
          }
        />
      )}

      {isOffPlatform && isAgreed && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
          Settled off platform. Sinnapi never held this money — there is nothing here to refund,
          release or reverse, and no escrow will ever exist for this booking.
        </Alert>
      )}
    </Stack>
  );
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'accepted':
      return 'Agreed by both parties';
    case 'countered':
      return 'Vendor proposed different terms — awaiting the client';
    case 'declined':
      return 'Never agreed';
    case 'proposed':
      return 'Proposed by the client — awaiting the vendor';
    default:
      return '—';
  }
}
