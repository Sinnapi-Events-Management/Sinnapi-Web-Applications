import { Chip, Typography, isQuotationBookable } from '@sinnapi/ui';
import ScheduleIcon from '@mui/icons-material/Schedule';
import type { QuotationBookingModel } from '@/lib/types';

type Props = {
  status: string;
  /** The booking the client made from this quote, if any. */
  booking: QuotationBookingModel | null;
};

/**
 * Whether an accepted quote has turned into a date, as one cell.
 *
 * The vendor's list previously stopped at `accepted`, which is the point at
 * which their attention is most needed and least directed: some accepted quotes
 * are waiting on the client to pick a date and some have already landed in the
 * bookings queue, and the quote row looked identical either way.
 *
 * Quiet for everything that has not been accepted — those rows are the vendor's
 * own queue and the status column already says so.
 */
export default function QuotationBookingCell({ status, booking }: Props) {
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
    <Chip
      size="small"
      color="warning"
      variant="outlined"
      icon={<ScheduleIcon />}
      label="Awaiting date"
    />
  );
}
