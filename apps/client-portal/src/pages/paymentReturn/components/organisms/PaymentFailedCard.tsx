import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { describePaymentFailure } from '@sinnapi/ui/payments';
import type { PaymentReturnModel } from '@/lib/types';

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
  const reversed = payment.status === 'refunded' || payment.status === 'partially_refunded';

  return (
    <SectionCard
      title={reversed ? 'Payment reversed' : 'Payment not completed'}
      subtitle={bookingRef ? `Booking ${bookingRef}` : undefined}
      icon={<ErrorOutlineIcon />}
      accent="error"
    >
      <Stack spacing={2.5}>
        <Alert severity="error">
          {describePaymentFailure(payment.status, payment.failure_reason)}
        </Alert>
        {!reversed && (
          <Typography variant="body2">
            Your booking is still confirmed and still waiting for payment. You can try again from
            the booking page, on the same payment method or a different one.
          </Typography>
        )}
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to={bookingHref} variant="contained">
              {reversed ? 'View booking' : 'Try again'}
            </Button>
            <Button component={RouterLink} to="/payments" variant="text">
              All payments
            </Button>
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );
}
