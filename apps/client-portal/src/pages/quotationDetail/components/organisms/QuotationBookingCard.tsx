import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, SectionCard, Skeleton, Stack, StatusChip, Typography } from '@sinnapi/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { QuotationPricing } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import { formatTimeWindow } from '@/pages/bookingDetail/utils/timeWindow';
import type { EventRefModel, QuotationDetailModel, VendorRefModel } from '@/lib/types';
import { useQuotationBooking } from '../../hooks/useQuotationBooking';
import CreateBookingDialog from './CreateBookingDialog';

type Props = {
  quotation: QuotationDetailModel;
  vendor: VendorRefModel | null;
  event: EventRefModel | null;
  pricing: QuotationPricing;
};

/**
 * The step that was missing: an accepted quote, turned into a booking.
 *
 * Accepting a quote settles a price. It does not settle a date — the quotation
 * carries none — so nothing appeared on the vendor's calendar and nothing
 * existed for escrow to fund. This card is where the client supplies the two
 * facts the quote never had.
 *
 * The card is absent entirely for a quote that has not been accepted: a control
 * the client cannot use yet is better not drawn than drawn greyed-out with an
 * explanation of a state they are not in.
 *
 * Layout only — `useQuotationBooking` owns the reads and the gating, and the
 * dialog owns the form.
 */
export default function QuotationBookingCard({ quotation, vendor, event, pricing }: Props) {
  const { booking, stage, isLoading, canCreate, isDialogOpen, openDialog, closeDialog } =
    useQuotationBooking(quotation);

  if (stage === 'not-accepted') return null;

  // `isPriced` alone is not enough: it means "the vendor built line items",
  // which a quote can satisfy while still totalling zero. What a booking needs
  // is an amount, because that is what both payment rails are priced against.
  const isBookablePrice = pricing.isPriced && pricing.total > 0;

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
            to={`/bookings/${booking.id}`}
          >
            Open booking
          </Button>
        </Stack>
      ) : !isBookablePrice ? (
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

          <Button
            fullWidth
            variant="contained"
            color="primary"
            disableElevation
            startIcon={<EventAvailableIcon />}
            onClick={openDialog}
          >
            Create booking
          </Button>
        </Stack>
      )}

      {/* Guarded as well as the button: the quotations list can deep-link
          straight into this dialog with `?book`, and that shortcut checks the
          quote is accepted without checking it has a price. */}
      <CreateBookingDialog
        quotation={quotation}
        vendor={vendor}
        event={event}
        pricing={pricing}
        open={isDialogOpen && isBookablePrice}
        onClose={closeDialog}
      />
    </SectionCard>
  );
}
