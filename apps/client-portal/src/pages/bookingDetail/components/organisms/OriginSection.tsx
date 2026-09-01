import { SectionGrid } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { one } from '@/lib/rel';
import type { BookingDetailModel, BookingEventModel, BookingQuotationModel } from '@/lib/types';
import BookingEventCard from './BookingEventCard';
import BookingQuotationCard from './BookingQuotationCard';

type Props = { booking: BookingDetailModel };

/**
 * Where the booking came from, in the order it actually happened: the client
 * asked on an event, a vendor quoted it, and this booking is what that quote
 * became.
 *
 * Either half can be missing — a booking made straight against a vendor's
 * service belongs to no event and never had a quote — so the columns are sized
 * against what is actually here. When neither is, the tab stays and says so: a
 * tab that disappeared from under a client mid-read would be worse than one
 * that explains itself.
 *
 * Both facts are already on the booking row as embedded relations, so deciding
 * this costs no extra read.
 */
export default function OriginSection({ booking }: Props) {
  const event = one<BookingEventModel>(booking.events);
  const quotation = one<BookingQuotationModel>(booking.quotations);

  if (!event && !quotation) {
    return (
      <EmptyState
        title="Booked directly"
        description="You booked this vendor straight from their listing — there was no event page or quotation behind it."
      />
    );
  }

  return (
    <SectionGrid
      // The quote takes the wider track when both are here: it is a table of
      // priced lines against the event's handful of rows. Alone, either takes
      // the full width rather than leaving the other's column empty.
      template={{ xs: '1fr', md: event && quotation ? '5fr 7fr' : '1fr' }}
    >
      <BookingEventCard booking={booking} />
      <BookingQuotationCard booking={booking} />
    </SectionGrid>
  );
}
