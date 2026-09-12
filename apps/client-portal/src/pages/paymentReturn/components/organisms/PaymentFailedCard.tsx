import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Typography } from '@sinnapi/ui';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  OutcomeActions,
  OutcomeCard,
  OutcomeHeader,
  OutcomeLayout,
  PaymentFactsPanel,
  describePaymentFailure,
} from '@sinnapi/ui/payments';
import type { PaymentReturnModel } from '@/lib/types';
import { usePaymentFacts } from '../../hooks/usePaymentFacts';

type Props = {
  payment: PaymentReturnModel;
  bookingRef: string | null;
  bookingHref: string;
};

/**
 * The provider said no, or took the money back.
 *
 * The reason is shown as the server recorded it; the retry is a link back to
 * the booking's Money tab rather than a Pay button here, because the booking
 * page is where the rail is chosen and the total quoted — a retry that skips
 * that would open a checkout for a figure the client has not seen again.
 */
export default function PaymentFailedCard({ payment, bookingRef, bookingHref }: Props) {
  const facts = usePaymentFacts({ payment, bookingRef });
  const reversed = payment.status === 'refunded' || payment.status === 'partially_refunded';

  return (
    <OutcomeLayout
      header={
        <OutcomeHeader
          accent="error"
          markVariant="glyph"
          markIcon={<ErrorOutlineIcon />}
          title={reversed ? 'Payment reversed' : 'Payment not completed'}
          reference={bookingRef ? `Booking ${bookingRef}` : undefined}
          description={
            reversed
              ? 'This payment was returned to you. Nothing is held for this booking.'
              : 'Your booking is unchanged and still waiting for payment.'
          }
        />
      }
      aside={
        <PaymentFactsPanel
          facts={facts}
          footer={
            <Typography variant="caption" color="text.secondary">
              Quote the reference above if you contact support.
            </Typography>
          }
        />
      }
    >
      <OutcomeCard accent="error">
        <Alert severity="error">
          {describePaymentFailure(payment.status, payment.failure_reason)}
        </Alert>

        {!reversed && (
          <Typography variant="body2" color="text.secondary">
            Your booking is still confirmed and still waiting for payment. You can try again from
            the booking page, on the same payment method or a different one.
          </Typography>
        )}

        <OutcomeActions>
          <Button component={RouterLink} to={bookingHref} variant="contained" size="large">
            {reversed ? 'View booking' : 'Try again'}
          </Button>
          <Button component={RouterLink} to="/payments" variant="outlined" size="large">
            All payments
          </Button>
        </OutcomeActions>
      </OutcomeCard>
    </OutcomeLayout>
  );
}
