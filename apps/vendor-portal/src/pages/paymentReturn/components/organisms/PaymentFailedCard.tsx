import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { describePaymentFailure } from '@sinnapi/ui/payments';
import type { PaymentReturnModel } from '@/lib/types';

type Props = { payment: PaymentReturnModel };

/**
 * The provider said no, or took the money back.
 *
 * The retry is a link back to the subscription page rather than a Pay button
 * here, because that page is where the plan is chosen and the price quoted —
 * a retry that skips it would open a checkout for a figure the vendor has not
 * seen again.
 */
export default function PaymentFailedCard({ payment }: Props) {
  const reversed = payment.status === 'refunded' || payment.status === 'partially_refunded';

  return (
    <SectionCard
      title={reversed ? 'Payment reversed' : 'Payment not completed'}
      icon={<ErrorOutlineIcon />}
      accent="error"
    >
      <Stack spacing={2.5}>
        <Alert severity="error">
          {describePaymentFailure(payment.status, payment.failure_reason)}
        </Alert>
        {!reversed && (
          <Typography variant="body2">
            Your current plan is unchanged. You can try again from the subscription page, on the
            same payment method or a different one.
          </Typography>
        )}
        <Box>
          <Button component={RouterLink} to="/subscription" variant="contained">
            {reversed ? 'View subscription' : 'Try again'}
          </Button>
        </Box>
      </Stack>
    </SectionCard>
  );
}
