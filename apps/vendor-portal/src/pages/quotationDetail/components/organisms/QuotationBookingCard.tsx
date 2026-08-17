import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, SectionCard, Skeleton, Stack, StatusChip, Typography } from '@sinnapi/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatIcon from '@mui/icons-material/Chat';
import { formatDate } from '@/lib/config';
import { formatTimeWindow } from '@/pages/bookingDetail/utils/timeWindow';
import { useStartConversation } from '@/hooks/messaging/useStartConversation';
import type { QuotationDetailModel } from '@/lib/types';
import { useQuotationBooking } from '../../hooks/useQuotationBooking';

type Props = { quotation: QuotationDetailModel };

/**
 * What happened after the client accepted.
 *
 * The vendor's half of the step the client's "Your booking" card owns. There is
 * no button to create anything here, and there should not be: the client picks
 * the date, because they are the only one who knows it and because a booking
 * the vendor conjured against someone else's accepted quote is a commitment
 * made on their behalf.
 *
 * What the vendor gets is the answer to the question an accepted quote used to
 * leave unanswered — has this become a real date, and is it waiting on me. When
 * it is waiting on the client instead, the only useful move is to ask them, so
 * that is the button.
 *
 * Layout only — `useQuotationBooking` owns the read and the gating.
 */
export default function QuotationBookingCard({ quotation }: Props) {
  const { booking, stage, isLoading, isAwaitingClient, isHidden } = useQuotationBooking(quotation);
  const message = useStartConversation();

  if (isHidden) return null;

  return (
    <SectionCard
      title="Booking"
      icon={<EventAvailableIcon />}
      accent={isAwaitingClient ? 'warning' : 'primary'}
      subtitle={isAwaitingClient ? 'Accepted — waiting on the client’s date' : undefined}
    >
      {message.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message.error}
        </Alert>
      )}

      {isLoading ? (
        <Skeleton variant="rounded" height={88} />
      ) : booking ? (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" fontWeight={600}>
              {booking.reference_no ?? 'Booking'}
            </Typography>
            <StatusChip status={booking.status} />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {[
              formatDate(booking.event_date),
              formatTimeWindow(booking.start_time, booking.end_time),
              booking.location,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>

          {booking.status === 'requested' && (
            <Alert severity="info">
              The client has picked a date. Confirm the booking to hold it, or decline if you are
              not free.
            </Alert>
          )}

          {stage === 'released' && (
            <Alert severity="warning">
              This booking is no longer going ahead. The quote cannot be re-booked — the client
              needs a fresh quote if they still want the work.
            </Alert>
          )}

          <Button
            fullWidth
            variant={booking.status === 'requested' ? 'contained' : 'outlined'}
            color={booking.status === 'requested' ? 'primary' : 'inherit'}
            disableElevation
            startIcon={<OpenInNewIcon />}
            component={RouterLink}
            to={`/bookings/${booking.id}`}
          >
            Open booking
          </Button>
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            The client has accepted your price, so the amount and the advance terms are settled.
            They still have to pick a date before this becomes a booking you can confirm — nothing
            is on your calendar until they do.
          </Typography>

          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            startIcon={<ChatIcon />}
            disabled={!quotation.client_id || message.isBusy}
            onClick={() => void message.messageClient(quotation.client_id)}
          >
            Ask the client for a date
          </Button>
        </Stack>
      )}
    </SectionCard>
  );
}
