import { SectionGrid } from '@sinnapi/ui';
import type { VendorBookingDetailModel } from '@/lib/types';
import BookingSettlementCard from './BookingSettlementCard';
import BookingTermsCard from './BookingTermsCard';
import BookingPaymentCard from './BookingPaymentCard';
import BookingAdvanceTermsCard from './BookingAdvanceTermsCard';

type Props = { booking: VendorBookingDetailModel };

/**
 * Everything about the money, in the order a vendor asks about it: can I be
 * paid out, what did we agree, where is the money now, and when does the rest
 * of it come.
 *
 * Settlement is first. Once the event is over it is the only reason a vendor
 * comes back to this page, and it is the one card here that is a request rather
 * than a record. Terms comes before payment because what was agreed precedes
 * what has moved, and advance terms last because that one answers "when does
 * the rest arrive" — a question only worth asking after the first two.
 *
 * Three of these four draw nothing in the states where they have nothing to
 * say; `SectionGrid` is why the survivors close up rather than sitting around
 * the gaps they leave. The payment card never does, so the section is never
 * empty.
 */
export default function MoneySection({ booking }: Props) {
  return (
    <SectionGrid>
      <BookingSettlementCard booking={booking} />
      <BookingTermsCard booking={booking} />
      <BookingPaymentCard booking={booking} />
      <BookingAdvanceTermsCard booking={booking} />
    </SectionGrid>
  );
}
