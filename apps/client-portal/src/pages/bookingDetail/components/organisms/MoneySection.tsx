import { SectionGrid } from '@sinnapi/ui';
import type { BookingDetailModel } from '@/lib/types';
import BookingSettlementCard from './BookingSettlementCard';
import BookingTermsCard from './BookingTermsCard';
import BookingEscrowCard from './BookingEscrowCard';

type Props = { booking: BookingDetailModel };

/**
 * Everything about the money, in the order a client asks about it: is anyone
 * waiting on me, what did we agree, and where is my payment now.
 *
 * Settlement is first whenever it exists. It is the only card on this page that
 * is a question addressed to the client, with their vendor waiting on the
 * answer, and it draws nothing until the vendor has asked. Terms comes before
 * escrow because what was agreed precedes what has moved, and while the terms
 * are unsettled it is the only card here with anything to do.
 *
 * Two of the three draw nothing in the states where they have nothing to say;
 * `SectionGrid` is why the survivors close up rather than sitting around the
 * gaps they leave. The escrow card never does, so the section is never empty.
 */
export default function MoneySection({ booking }: Props) {
  return (
    <SectionGrid>
      <BookingSettlementCard booking={booking} />
      <BookingTermsCard booking={booking} />
      <BookingEscrowCard booking={booking} />
    </SectionGrid>
  );
}
