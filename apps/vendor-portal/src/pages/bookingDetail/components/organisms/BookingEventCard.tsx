import { EventContextRows, SectionCard } from '@sinnapi/ui';
import CelebrationIcon from '@mui/icons-material/Celebration';
import { one } from '@/lib/rel';
import type { BookingEventModel, VendorBookingDetailModel } from '@/lib/types';

type Props = { booking: VendorBookingDetailModel };

/**
 * The event this booking was requested against, when the vendor may see it.
 *
 * Its real weight for a vendor is the inherited terms. Where the client set a
 * payment rail on the event, `payment_terms_from_event` is true and the
 * counter option disappears from the actions card — and a vendor who cannot
 * counter, with nothing on the page explaining why, opens a support thread
 * every time.
 *
 * Absent on a booking against a client's private event: `events_public_read`
 * withholds those from vendors, so the embed resolves to null and there is
 * nothing here to show. The booking's own date and location are unaffected.
 */
export default function BookingEventCard({ booking }: Props) {
  const event = one<BookingEventModel>(booking.events);

  if (!event) return null;

  return (
    <SectionCard title="The event this is for" icon={<CelebrationIcon />} accent="info">
      <EventContextRows
        event={event}
        termsFromEvent={booking.payment_terms_from_event}
        perspective="vendor"
      />
    </SectionCard>
  );
}
