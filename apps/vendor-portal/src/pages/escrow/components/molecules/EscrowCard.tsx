import { RecordCard, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { BookingRel, EscrowModel } from '@/lib/types';

/**
 * One escrow record on a phone. Read-only, like the table: release is the
 * client's and Sinnapi's step, not the vendor's. The line under the amount
 * answers "when does my advance arrive", the question a vendor opens this for.
 */
export default function EscrowCard({ escrow: e }: { escrow: EscrowModel }) {
  const advance = e.advance_released_at
    ? `Advance ${formatMoney(e.advance_amount, e.currency)} sent ${formatDate(e.advance_released_at)}`
    : e.advance_release_due_at
      ? `Advance ${formatMoney(e.advance_amount, e.currency)} due ${formatDate(e.advance_release_due_at)}`
      : `Rest paid after client confirms`;

  return (
    <RecordCard
      title={`Booking ${one<BookingRel>(e.bookings)?.reference_no ?? '—'}`}
      amount={formatMoney(e.agreed_amount ?? e.net_payout_amount, e.currency)}
      meta={advance}
      chip={<StatusChip status={e.status} />}
    />
  );
}
