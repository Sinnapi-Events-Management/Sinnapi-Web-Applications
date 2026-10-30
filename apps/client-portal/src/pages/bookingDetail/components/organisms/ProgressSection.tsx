import { SectionGrid } from '@sinnapi/ui';
import type { BookingDetailModel } from '@/lib/types';
import BookingTimelineCard from './BookingTimelineCard';
import BookingNextStepsCard from './BookingNextStepsCard';

type Props = { booking: BookingDetailModel };

/**
 * How the booking got to where it is, and what comes after it.
 *
 * The two belong together: the trail ends at the booking's current state, and
 * next steps is what that state leaves the client to do. Reading the last row
 * of one and the first line of the other is the same question answered twice —
 * once backwards, once forwards.
 *
 * The vendor's name no longer comes through here. It was threaded down for the
 * review composer, and the rating has moved to the action bar pinned above the
 * tabs, where clients can actually find it; this section is a record again.
 */
export default function ProgressSection({ booking }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
      <BookingTimelineCard bookingId={booking.id} status={booking.status} />
      <BookingNextStepsCard booking={booking} />
    </SectionGrid>
  );
}
