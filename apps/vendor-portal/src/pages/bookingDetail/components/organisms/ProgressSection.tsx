import type { VendorBookingDetailModel } from '@/lib/types';
import BookingTimelineCard from './BookingTimelineCard';

type Props = { booking: VendorBookingDetailModel };

/**
 * How the booking got to where it is. One card, full width — the trail is a
 * list of dated rows and splitting it into a column would only make each row
 * wrap sooner.
 */
export default function ProgressSection({ booking }: Props) {
  return <BookingTimelineCard bookingId={booking.id} status={booking.status} />;
}
