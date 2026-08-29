import { Skeleton } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useSettlementAdmin } from '../../hooks/useSettlementAdmin';
import BookingSettlementCard from './BookingSettlementCard';

type Props = { bookingId: string };

/**
 * What Sinnapi is holding on this booking, and the settlement decision waiting
 * on us.
 *
 * Its own tab rather than a card in Payment because this is the one surface on
 * the page where the console does something no other party can: release the
 * money, forward the request, or refuse it. A workspace earns a tab; a status
 * an operator merely reads does not.
 *
 * Most bookings have no settlement request — one only exists after a vendor
 * asks to be paid out on a disputed amount — and the card draws nothing at all
 * in that case. That is right for a card in a stack of them and wrong for a
 * whole tab, which would then read as a panel that failed to load. So the
 * section names the empty case, and the tab stays put either way rather than
 * appearing and disappearing as settlements open and close.
 *
 * The read is `useSettlementAdmin`, the same hook the card uses. React Query
 * dedupes it, so asking here costs a cache hit rather than a second round trip,
 * and the section and the card cannot disagree about whether a request exists.
 */
export default function EscrowSection({ bookingId }: Props) {
  const { request, isLoading } = useSettlementAdmin(bookingId);

  // A placeholder rather than the empty state: "nothing to settle" flashing up
  // and being replaced by a live request is worse than a beat of nothing.
  if (isLoading) return <Skeleton variant="rounded" height={220} />;

  if (!request) {
    return (
      <EmptyState
        title="Nothing to settle"
        description="No settlement has been requested on this booking. One appears here if the vendor asks to be paid a different amount than was agreed, and this is where it would be forwarded or released."
      />
    );
  }

  return <BookingSettlementCard bookingId={bookingId} />;
}
