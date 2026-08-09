import { Link as RouterLink } from 'react-router-dom';
import { Button, Divider, Stack, SectionCard } from '@sinnapi/ui';
import BoltIcon from '@mui/icons-material/Bolt';
import ChatIcon from '@mui/icons-material/Chat';
import BookingResponseActions from '@/components/booking/BookingResponseActions';
import { hasBookingResponseActions } from '@/components/booking/bookingActions';

type Props = {
  bookingId: string;
  status: string;
  /**
   * Whether the booking is still waiting on this vendor. An untouched request
   * is the one thing on the page that needs doing, so the panel takes the
   * gold accent then and stays neutral once the decision is made.
   */
  needsResponse: boolean;
};

/**
 * What the vendor can do about this booking: the status write that applies to
 * its current state, plus the way to reach the client without one.
 *
 * `BookingResponseActions` owns the RPC calls, its own busy/error state, and the
 * cache invalidation that follows — this card only decides where it sits and how
 * loudly it asks for attention.
 */
export default function BookingActionsCard({ bookingId, status, needsResponse }: Props) {
  // A settled booking — completed, cancelled, declined — has no status write
  // left, and messaging is then the only thing this card offers.
  const canRespond = hasBookingResponseActions(status);

  return (
    <SectionCard
      title={needsResponse ? 'Respond to request' : 'Actions'}
      icon={<BoltIcon />}
      accent={needsResponse ? 'secondary' : 'info'}
      subtitle={needsResponse ? 'This request is waiting on you' : undefined}
    >
      <Stack spacing={2}>
        {canRespond && (
          <>
            <BookingResponseActions bookingId={bookingId} status={status} />
            <Divider />
          </>
        )}
        <Button
          component={RouterLink}
          to="/messages"
          variant="text"
          startIcon={<ChatIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Message client
        </Button>
      </Stack>
    </SectionCard>
  );
}
