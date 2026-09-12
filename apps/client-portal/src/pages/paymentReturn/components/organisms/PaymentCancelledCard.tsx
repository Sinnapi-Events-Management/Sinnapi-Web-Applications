import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Typography } from '@sinnapi/ui';
import UndoIcon from '@mui/icons-material/Undo';
import { OutcomeActions, OutcomeCard, OutcomeHeader, OutcomeLayout } from '@sinnapi/ui/payments';

type Props = {
  bookingRef: string | null;
  bookingHref: string;
};

/**
 * The payer left the provider's hosted checkout before it was completed.
 *
 * No money was captured, so there is nothing to reverse — and nothing to
 * itemise, which is why this is the one outcome with no rail beside it. The
 * layout centres a single column at a readable measure instead of leaving an
 * empty panel where a receipt would be.
 */
export default function PaymentCancelledCard({ bookingRef, bookingHref }: Props) {
  return (
    <OutcomeLayout
      header={
        <OutcomeHeader
          accent="warning"
          markVariant="glyph"
          markIcon={<UndoIcon />}
          title="Payment cancelled"
          reference={bookingRef ? `Booking ${bookingRef}` : undefined}
          description="You left the checkout before it was completed. No money was taken."
        />
      }
    >
      <OutcomeCard accent="warning">
        <Alert severity="info">Your booking is unchanged and still waiting for payment.</Alert>
        <Typography variant="body2" color="text.secondary">
          You can try again from the booking page, on the same payment method or a different one.
        </Typography>
        <OutcomeActions>
          <Button component={RouterLink} to={bookingHref} variant="contained" size="large">
            Try again
          </Button>
          <Button component={RouterLink} to="/payments" variant="outlined" size="large">
            All payments
          </Button>
        </OutcomeActions>
      </OutcomeCard>
    </OutcomeLayout>
  );
}
