import { Alert, Box, Button, LinearProgress, SectionCard, Stack, Typography } from '@sinnapi/ui';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { checkoutRailLabel, describePaymentFailure } from '@sinnapi/ui/payments';
import { APP, formatMoney } from '@/lib/config';
import type { PaymentReturnModel } from '@/lib/types';
import type { ReturnState } from '../../hooks/usePaymentReturn';

type Props = {
  state: Exclude<ReturnState, 'invalid' | 'loading' | 'not_found'>;
  payment: PaymentReturnModel;
  email: string | null;
  onCheckAgain: () => void;
  isChecking: boolean;
};

/**
 * A subscription payment that came back to the client portal.
 *
 * Subscriptions are paid from the vendor portal and normally return there;
 * this card exists so a vendor sent here by a default callback URL is told the
 * truth about their payment rather than shown an escrow breakdown with nothing
 * in it. It says what happened and, when the vendor portal's origin is
 * configured, where to go next. It never offers a second payment.
 */
export default function SubscriptionOutcomeCard({
  state,
  payment,
  email,
  onCheckAgain,
  isChecking,
}: Props) {
  const manageHref = APP.vendorPortalUrl
    ? `${APP.vendorPortalUrl.replace(/\/$/, '')}/subscription`
    : null;
  const amount = formatMoney(payment.amount, payment.currency);
  const rail = checkoutRailLabel(payment.provider, payment.provider_method);

  const manage = manageHref ? (
    <Button href={manageHref} variant="contained">
      Open vendor portal
    </Button>
  ) : null;

  if (state === 'confirmed') {
    return (
      <SectionCard title="Subscription paid" icon={<CheckCircleIcon />} accent="success">
        <Stack spacing={2.5}>
          <Alert severity="success">{amount} received. Your plan is now active.</Alert>
          <Typography variant="body2">
            {email ? (
              <>
                A confirmation with your period dates is on its way to <b>{email}</b>.
              </>
            ) : (
              <>A confirmation with your period dates is on its way.</>
            )}{' '}
            Your subscription is managed from the vendor portal.
          </Typography>
          {manage && <Box>{manage}</Box>}
        </Stack>
      </SectionCard>
    );
  }

  if (state === 'failed') {
    return (
      <SectionCard title="Payment not completed" icon={<ErrorOutlineIcon />} accent="error">
        <Stack spacing={2.5}>
          <Alert severity="error">
            {describePaymentFailure(payment.status, payment.failure_reason)}
          </Alert>
          <Typography variant="body2">
            Your current plan is unchanged. You can try again from the subscription page in the
            vendor portal.
          </Typography>
          {manage && <Box>{manage}</Box>}
        </Stack>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={state === 'checking' ? 'Confirming your payment' : 'Still processing'}
      icon={<HourglassTopIcon />}
      accent={state === 'checking' ? 'secondary' : 'warning'}
    >
      <Stack spacing={2.5}>
        {state === 'checking' && <LinearProgress aria-label="Waiting for the payment provider" />}
        <Typography variant="body2">
          We&rsquo;re waiting for {rail} to confirm {amount}.{' '}
          {state === 'checking'
            ? 'This usually takes a few seconds; there is nothing you need to do.'
            : 'That can take a few minutes when a mobile-money prompt is answered late. Your plan activates on its own the moment it clears.'}
        </Typography>
        {state === 'processing' && (
          <Alert severity="info">
            Please don&rsquo;t pay again. A second checkout is refused while this one is open.
          </Alert>
        )}
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {state === 'processing' && (
              <Button onClick={onCheckAgain} variant="outlined" disabled={isChecking}>
                {isChecking ? 'Checking…' : 'Check again'}
              </Button>
            )}
            {manage}
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );
}
