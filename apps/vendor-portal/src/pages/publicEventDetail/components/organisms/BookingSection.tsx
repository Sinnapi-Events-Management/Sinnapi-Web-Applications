import { Alert, SectionCard, Skeleton, Stack } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import type { VendorEventBookingModel } from '@/lib/types';
import BookingSummaryCard from '../molecules/BookingSummaryCard';

type Props = {
  bookings: {
    rows: VendorEventBookingModel[];
    isLoading: boolean;
    error: unknown;
  };
};

/**
 * What this brief turned into, if anything.
 *
 * The section renders whether or not there is a booking, which is why the tab
 * beside it is permanent: a tab that appears the moment a client accepts a quote
 * would move the three next to it under the reader's finger, and a vendor who
 * has learned the page has four sections should find four every time.
 *
 * Empty is the ordinary state here — most briefs a vendor quotes for are won by
 * somebody else — so the copy says what has to happen rather than treating it as
 * a gap.
 */
export default function BookingSection({ bookings }: Props) {
  if (bookings.error) {
    return (
      <Alert severity="error">
        {bookings.error instanceof Error ? bookings.error.message : 'Could not load your bookings.'}
      </Alert>
    );
  }

  if (bookings.isLoading) {
    return (
      <SectionCard title="Your booking" icon={<EventAvailableOutlinedIcon />}>
        <Skeleton variant="rounded" height={88} />
      </SectionCard>
    );
  }

  if (bookings.rows.length === 0) {
    return (
      <EmptyState
        title="No booking on this event"
        description="A booking appears here once the client accepts one of your quotes."
      />
    );
  }

  return (
    <SectionCard
      title={bookings.rows.length === 1 ? 'Your booking' : 'Your bookings'}
      icon={<EventAvailableOutlinedIcon />}
      subtitle="Open one for its payment window, escrow and settlement"
    >
      <Stack spacing={2}>
        {bookings.rows.map((booking) => (
          <BookingSummaryCard key={booking.id} booking={booking} />
        ))}
      </Stack>
    </SectionCard>
  );
}
