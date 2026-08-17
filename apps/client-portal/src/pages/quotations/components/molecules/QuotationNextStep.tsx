import { Button, Chip, Typography, isQuotationBookable } from '@sinnapi/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { QuotationBookingModel } from '@/lib/types';

type Props = {
  status: string;
  /** The booking already made from this quote, if there is one. */
  booking: QuotationBookingModel | null;
  onBook: () => void;
};

/**
 * What is waiting on the client for this quote, as one cell.
 *
 * Only an accepted quote with nothing booked against it gets a control.
 * Everything else is either the vendor's turn, already settled, or already
 * booked — and a column of buttons that mostly do nothing is worse than a
 * column that is mostly quiet, because the one row that needs an action stops
 * standing out.
 *
 * The button is deliberately not "open quote": the row already does that. It
 * lands on the quote with the booking dialog open, which is a different move
 * and the one an accepted quote is actually waiting for.
 */
export default function QuotationNextStep({ status, booking, onBook }: Props) {
  if (booking) {
    return <Chip size="small" variant="outlined" label={booking.reference_no ?? 'Booked'} />;
  }

  if (!isQuotationBookable(status)) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Button
      size="small"
      variant="contained"
      color="primary"
      disableElevation
      startIcon={<EventAvailableIcon />}
      // The row's own click handler opens the quote; this one has its own
      // destination, so it must not also fire that.
      onClick={(e) => {
        e.stopPropagation();
        onBook();
      }}
    >
      Create booking
    </Button>
  );
}
