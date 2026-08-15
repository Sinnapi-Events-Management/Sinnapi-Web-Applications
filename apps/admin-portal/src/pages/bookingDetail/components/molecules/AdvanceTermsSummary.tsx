import { Alert, InfoRow, Stack, Typography } from '@sinnapi/ui';
import { formatDate, formatDateTime } from '@/lib/config';
import type { BookingAdminModel } from '@/lib/types';

type Props = { booking: BookingAdminModel };

/**
 * The advance schedule this booking was funded under, and the consent behind
 * it.
 *
 * The consent stamp is the point of this block, not a footnote. `activate_escrow`
 * refuses without it, so an operator looking at a booking that will not fund is
 * usually looking at a missing acceptance — and the rate matters only alongside
 * who agreed to it and when.
 */
export default function AdvanceTermsSummary({ booking: b }: Props) {
  const hasTerms = b.advance_rate !== null || b.advance_release_days_before !== null;

  if (!hasTerms) {
    return (
      <Alert severity="info" variant="outlined">
        No advance schedule was set on this booking. It predates the advance terms, or the quotation
        behind it carried none.
      </Alert>
    );
  }

  return (
    <Stack>
      <InfoRow label="Advance rate" value={b.advance_rate === null ? null : `${b.advance_rate}%`} />
      <InfoRow
        label="Released before event"
        value={
          b.advance_release_days_before === null
            ? null
            : `${b.advance_release_days_before} day${b.advance_release_days_before === 1 ? '' : 's'}`
        }
      />
      <InfoRow
        label="Client accepted"
        value={
          b.advance_terms_accepted_at
            ? formatDateTime(b.advance_terms_accepted_at)
            : 'Not yet accepted'
        }
      />
      {b.advance_terms_accepted_by && (
        <InfoRow label="Accepted by" value={b.advance_terms_accepted_by} />
      )}
      {b.escrow?.advance_release_due_at && (
        <InfoRow label="Advance due" value={formatDate(b.escrow.advance_release_due_at)} />
      )}

      {b.advance_terms_note && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pt: 1 }}>
          “{b.advance_terms_note}”
        </Typography>
      )}
    </Stack>
  );
}
