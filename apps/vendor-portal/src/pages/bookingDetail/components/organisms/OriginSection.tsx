import { SectionGrid } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { one } from '@/lib/rel';
import type {
  BookingEventModel,
  BookingQuotationModel,
  DirectoryProfile,
  VendorBookingDetailModel,
} from '@/lib/types';
import BookingEventCard from './BookingEventCard';
import BookingQuotationCard from './BookingQuotationCard';

type Props = {
  booking: VendorBookingDetailModel;
  client: DirectoryProfile | null;
};

/**
 * Where the booking came from, in the order it actually happened: a request on
 * an event, a quote against it, and the booking that quote became.
 *
 * Either half can be missing — a request placed straight against a service
 * never had a quote, and `events_public_read` withholds a client's private
 * event from the vendor — so the columns are sized against what is actually
 * here. When neither is, the tab stays and says so: a tab that disappeared
 * from under a vendor mid-read would be worse than one that explains itself.
 *
 * Both facts are already on the booking row as embedded relations, so deciding
 * this costs no extra read.
 */
export default function OriginSection({ booking, client }: Props) {
  const event = one<BookingEventModel>(booking.events);
  const quotation = one<BookingQuotationModel>(booking.quotations);

  if (!event && !quotation) {
    return (
      <EmptyState
        title="Booked directly"
        description="This booking came straight from a request against your service — there was no event page or quotation behind it."
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
      <BookingQuotationCard booking={booking} client={client} />
    </SectionGrid>
  );
}
