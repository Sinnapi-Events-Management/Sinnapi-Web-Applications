import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, SectionCard, Skeleton, Stack, StatusChip, Typography } from '@sinnapi/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatDate } from '@/lib/config';
import { formatTimeWindow } from '@/pages/bookingDetail/utils/timeWindow';
import type { QuotationBookingState } from '../../hooks/useQuotationBooking';

type Props = {
  /**
   * The page's single booking state — see `useQuotationDetailPage`. Handed down
   * rather than read here, because the bar above the tabs opens the same dialog
   * and the two must not keep separate answers to "is it booked".
   */
  booking: QuotationBookingState;
};

/**
 * What became of an accepted quote, in the section that keeps the record.
 *
 * This card used to be the only way to schedule a quote, and the button was two
 * taps deep — see `QuotationBookingBar`, which now leads on that. What is left
 * here is the record the bar deliberately does not carry: the reference, the
 * status chip, the full date and location, and the warning that a booking fell
 * through. The card keeps a Create button for the client already reading this
 * section, but an outlined one: the page has one primary call to action and it
 * is the one above the tabs.
 *
 * The card is absent entirely for a quote that has not been accepted: a control
 * the client cannot use yet is better not drawn than drawn greyed-out with an
 * explanation of a state they are not in.
 *
 * Presentational — `useQuotationBooking` owns the reads and the gating, and the
 * page owns the dialog.
 */
export default function QuotationBookingCard({ booking }: Props) {
  const { booking: made, stage, isLoading, canCreate, blockedBy, openDialog } = booking;

  if (stage === 'not-accepted') return null;

  return (
    <SectionCard
      title="Your booking"
      icon={<EventAvailableIcon />}
      accent={canCreate ? 'success' : 'primary'}
      subtitle={canCreate ? 'The price is agreed — now pick a date' : undefined}
    >
      {/* Still resolving whether a booking exists. A button here would flash and
          then be replaced by a link to a booking that already existed. */}
      {isLoading ? (
        <Skeleton variant="rounded" height={96} />
      ) : made ? (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" fontWeight={600}>
              {made.reference_no ?? 'Booking'}
            </Typography>
            <StatusChip status={made.status} />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {[
              formatDate(made.event_date),
              formatTimeWindow(made.start_time, made.end_time),
              made.location,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>

          {stage === 'released' && (
            <Alert severity="warning">
              This booking is no longer going ahead. The quote cannot be re-booked — ask the vendor
              for a fresh quote if you still want the work.
            </Alert>
          )}

          <Button
            fullWidth
            variant={stage === 'released' ? 'outlined' : 'contained'}
            color={stage === 'released' ? 'inherit' : 'primary'}
            disableElevation
            startIcon={<OpenInNewIcon />}
            component={RouterLink}
            to={`/bookings/${made.id}`}
          >
            Open booking
          </Button>
        </Stack>
      ) : blockedBy === 'unpriced' ? (
        /* An accepted quote with no price on it. This was always broken — the
           booking would carry an amount of zero and escrow would later refuse
           to fund it — but it used to fail late and quietly. Now that the
           payment terms are agreed up front there is nothing to price them
           against either, so it fails here instead, where the client can still
           do something about it. */
        <Alert severity="warning">
          This quote has no price on it, so there is nothing to book yet. Ask your vendor to send
          the priced quote and you can schedule it then.
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            You have accepted this quote, so the price is settled. Creating the booking sends the
            vendor your date and how you want to pay, so they can confirm all three.
          </Typography>

          {/* Outlined, unlike the bar's. Both open the same dialog and both can
              be on screen at once when this tab is the open one — two identical
              filled buttons would read as two different actions. */}
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            startIcon={<EventAvailableIcon />}
            onClick={openDialog}
          >
            Create booking
          </Button>
        </Stack>
      )}
    </SectionCard>
  );
}
