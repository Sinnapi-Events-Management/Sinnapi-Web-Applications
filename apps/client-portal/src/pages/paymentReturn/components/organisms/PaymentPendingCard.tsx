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
  bookingRef: string | null;
  bookingHref: string;
  email: string | null;
  onCheckAgain: () => void;
  isChecking: boolean;
};

/**
 * The IPN has not landed. Two honest versions of that, chosen by the hook.
 *
 * While the page is still polling, the client is told the answer is seconds
 * away and shown that something is happening. Once the budget is spent the
 * same page stops pretending: the provider is slow, here is what will happen
 * instead, and here — in the rail, copyable — is the reference to quote.
 * Neither version invites a second payment: the server would refuse one while
 * this checkout is open, and a client who reads "still processing" as "try
 * again" is the double charge this whole flow exists to prevent.
 */
export default function PaymentPendingCard({
  phase,
  payment,
  rail,
  bookingRef,
  bookingHref,
  email,
  onCheckAgain,
  isChecking,
}: Props) {
  const facts = usePaymentFacts({ payment, bookingRef });
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
          reference={bookingRef ? `Booking ${bookingRef}` : undefined}
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
              {email ? (
                <>
                  However this ends, we&rsquo;ll email <b>{email}</b> and the booking page will show
                  it.
                </>
              ) : (
                <>However this ends, we&rsquo;ll email you and the booking page will show it.</>
              )}
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
              , and the booking page updates on its own.
            </Typography>
            <Alert severity="info">
              Please don&rsquo;t pay again. A second checkout for this booking is refused while this
              one is open, and if this payment does not go through the booking page will offer a
              fresh one.
            </Alert>
          </Stack>
        )}

        <OutcomeActions>
          <Button component={RouterLink} to={bookingHref} variant="contained" size="large">
            View booking
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
