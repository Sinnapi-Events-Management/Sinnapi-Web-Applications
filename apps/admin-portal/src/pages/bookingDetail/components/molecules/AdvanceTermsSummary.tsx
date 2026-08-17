import { AdvanceTermsRows, Alert } from '@sinnapi/ui';
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
 *
 * The rows themselves are `@sinnapi/ui`'s, shared with the vendor's own copy of
 * this schedule: an operator answering "where is my advance?" should be reading
 * the same figures, in the same order, as the vendor who asked.
 */
export default function AdvanceTermsSummary({ booking: b }: Props) {
  return (
    <AdvanceTermsRows
      rate={b.advance_rate}
      daysBefore={b.advance_release_days_before}
      note={b.advance_terms_note}
      acceptedAt={b.advance_terms_accepted_at}
      acceptedBy={b.advance_terms_accepted_by}
      advanceDueAt={b.escrow?.advance_release_due_at}
      currency={b.escrow?.currency ?? b.currency}
      emptyMessage={
        <Alert severity="info" variant="outlined">
          No advance schedule was set on this booking. It predates the advance terms, or the
          quotation behind it carried none.
        </Alert>
      }
    />
  );
}
