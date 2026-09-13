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
  const facts = usePaymentFacts(payment);
  const reversed = payment.status === 'refunded' || payment.status === 'partially_refunded';

  return (
    <OutcomeLayout
      header={
        <OutcomeHeader
          accent="error"
          markVariant="glyph"
          markIcon={<ErrorOutlineIcon />}
          title={reversed ? 'Payment reversed' : 'Payment not completed'}
          description="Your current plan is unchanged."
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
            You can try again from the subscription page, on the same payment method or a different
            one.
          </Typography>
        )}

        <OutcomeActions>
          <Button component={RouterLink} to="/subscription" variant="contained" size="large">
            {reversed ? 'View subscription' : 'Try again'}
          </Button>
          <Button component={RouterLink} to="/dashboard" variant="outlined" size="large">
            Go to dashboard
          </Button>
        </OutcomeActions>
      </OutcomeCard>
    </OutcomeLayout>
  );
}
