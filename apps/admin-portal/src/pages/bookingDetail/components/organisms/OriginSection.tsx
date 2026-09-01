import { EmptyState } from '@sinnapi/ui/router';
import type { BookingAdminModel } from '@/lib/types';
import BookingQuotationCard from './BookingQuotationCard';

type Props = { booking: BookingAdminModel };

/**
 * What was agreed before this booking existed: the quotation it came from,
 * rendered in full rather than linked.
 *
 * One card, full width. It is a priced document with a variance note against
 * the booking amount, and the comparison it exists to make — "does what we are
 * holding match what was quoted?" — is read across a table that wants the
 * width.
 *
 * A booking placed directly against a service never had a quote. The tab stays
 * and says so: it would otherwise vanish from under an operator between one
 * booking and the next, and a section rendering nothing at all reads as a panel
 * that failed to load rather than as an absence with a reason.
 */
export default function OriginSection({ booking }: Props) {
  if (!booking.quotation) {
    return (
      <EmptyState
        title="Booked directly"
        description="This booking was placed straight against the vendor's service — there was no quotation behind it, so there is no quoted figure to compare the amount against."
      />
    );
  }

  return <BookingQuotationCard quotation={booking.quotation} booking={booking} />;
}
