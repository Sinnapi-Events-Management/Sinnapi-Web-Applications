import { SectionGrid } from '@sinnapi/ui';
import type { BookingDetailModel } from '@/lib/types';
import BookingTimelineCard from './BookingTimelineCard';
import BookingNextStepsCard from './BookingNextStepsCard';

type Props = {
  booking: BookingDetailModel;
  /** Only a completed booking has anything to review. */
  canReview: boolean;
};

/**
 * How the booking got to where it is, and what comes after it.
 *
 * The two belong together: the trail ends at the booking's current state, and
 * next steps is what that state leaves the client to do. Reading the last row
 * of one and the first line of the other is the same question answered twice —
 * once backwards, once forwards.
 */
export default function ProgressSection({ booking, canReview }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
      <BookingTimelineCard bookingId={booking.id} status={booking.status} />
      <BookingNextStepsCard canReview={canReview} />
    </SectionGrid>
  );
}
