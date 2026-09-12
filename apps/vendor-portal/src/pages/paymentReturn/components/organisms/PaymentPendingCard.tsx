import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, LinearProgress, Stack, Typography } from '@sinnapi/ui';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ScheduleIcon from '@mui/icons-material/Schedule';
import {
  OutcomeActions,
  OutcomeCard,
  OutcomeHeader,
  OutcomeLayout,
  PaymentFactsPanel,
} from '@sinnapi/ui/payments';
import type { PaymentReturnModel } from '@/lib/types';
import { usePaymentFacts } from '../../hooks/usePaymentFacts';

type Props = {
  /** `checking` while the poll is live, `processing` once it has given up. */
  phase: 'checking' | 'processing';
  payment: PaymentReturnModel;
  rail: string;
  email: string | null;
  onCheckAgain: () => void;
  isChecking: boolean;
};

/**
 * The IPN has not landed. Two honest versions of that, chosen by the hook.
 *
 * Neither version invites a second payment — the server refuses one while
 * this checkout is open, and a vendor who reads "still processing" as "try
 * again" is the double charge this flow exists to prevent.
 */
export default function PaymentPendingCard({
  phase,
  payment,
  rail,
  email,
  onCheckAgain,
  isChecking,
}: Props) {
  const facts = usePaymentFacts(payment);
  const waiting = phase === 'checking';

  return (
    <OutcomeLayout
      header={
        <OutcomeHeader
          accent={waiting ? 'secondary' : 'warning'}
          markVariant="glyph"
          markIcon={waiting ? <HourglassTopIcon /> : <ScheduleIcon />}
          pulse={waiting}
          title={waiting ? 'Confirming your payment' : 'Still processing'}
          description={
            waiting
              ? `We're waiting for ${rail} to confirm the payment. This usually takes a few seconds; there is nothing you need to do.`
              : `${rail} has not confirmed this payment yet. That is normal when a mobile-money prompt is answered late or the provider is busy, and it can take a few minutes.`
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
      <OutcomeCard accent={waiting ? 'secondary' : 'warning'}>
        {waiting ? (
          <Stack spacing={2}>
            <LinearProgress
              aria-label="Waiting for the payment provider"
              sx={{ borderRadius: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              Your plan activates on its own the moment it clears.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {email ? (
                <>
                  We&rsquo;ll email <b>{email}</b> the moment it clears
                </>
              ) : (
                <>We&rsquo;ll email you the moment it clears</>
              )}
              , and your plan activates on its own.
            </Typography>
            <Alert severity="info">
              Please don&rsquo;t pay again. A second checkout is refused while this one is open, and
              if this payment does not go through the subscription page will offer a fresh one.
            </Alert>
          </Stack>
        )}

        <OutcomeActions>
          <Button component={RouterLink} to="/subscription" variant="contained" size="large">
            View subscription
          </Button>
          {!waiting && (
            <Button onClick={onCheckAgain} variant="outlined" size="large" disabled={isChecking}>
              {isChecking ? 'Checking…' : 'Check again'}
            </Button>
          )}
        </OutcomeActions>
      </OutcomeCard>
    </OutcomeLayout>
  );
}
