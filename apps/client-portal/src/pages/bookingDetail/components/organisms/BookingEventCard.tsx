import { Link as RouterLink } from 'react-router-dom';
import { Button, EventContextRows, SectionCard, Stack } from '@sinnapi/ui';
import CelebrationIcon from '@mui/icons-material/Celebration';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { one } from '@/lib/rel';
import type { BookingDetailModel, BookingEventModel } from '@/lib/types';

type Props = { booking: BookingDetailModel };

/**
 * The event this booking belongs to, when it belongs to one.
 *
 * A client arranging a wedding has a caterer, a venue and a band under one
 * event, and each of those bookings looks identical without saying which
 * occasion it is for. This is also the only place the page can explain a
 * locked payment rail: terms set on the event apply to every booking under it,
 * which is why the terms card offers no choice.
 *
 * Absent on a booking made straight against a vendor's service.
 */
export default function BookingEventCard({ booking }: Props) {
  const event = one<BookingEventModel>(booking.events);

  if (!event) return null;

  return (
    <SectionCard title="Part of your event" icon={<CelebrationIcon />} accent="info">
      <Stack spacing={2}>
        <EventContextRows
          event={event}
          termsFromEvent={booking.payment_terms_from_event}
          perspective="client"
        />

        {/* The portal has no per-event page — events are managed from one
            list — so this goes where the client can actually act on it. */}
        <Button
          component={RouterLink}
          to="/my-events"
          variant="text"
          startIcon={<OpenInNewIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Manage your events
        </Button>
      </Stack>
    </SectionCard>
  );
}
