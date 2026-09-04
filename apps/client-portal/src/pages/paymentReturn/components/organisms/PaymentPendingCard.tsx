import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, SectionCard, Stack, Typography } from '@sinnapi/ui';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ScheduleIcon from '@mui/icons-material/Schedule';

type Props = {
  /** `checking` while the poll is live, `processing` once it has given up. */
  phase: 'checking' | 'processing';
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
 * instead, and here is the reference to quote. Neither version invites a
 * second payment — the server would refuse one while this checkout is open,
 * and a client who reads "still processing" as "try again" is the double
 * charge this whole flow exists to prevent.
 */
export default function PaymentPendingCard({
  phase,
  rail,
  bookingRef,
  bookingHref,
  email,
  onCheckAgain,
  isChecking,
}: Props) {
  const ref = bookingRef ? (
    <>
      {' '}
      Quote booking <b>{bookingRef}</b> if you contact support.
    </>
  ) : null;

  if (phase === 'checking') {
    return (
      <SectionCard
        title="Confirming your payment"
        subtitle={bookingRef ? `Booking ${bookingRef}` : undefined}
        icon={<HourglassTopIcon />}
        accent="secondary"
      >
        <Stack spacing={2.5}>
          <LinearProgress aria-label="Waiting for the payment provider" />
          <Typography variant="body2">
            We&rsquo;re waiting for {rail} to confirm the payment. This usually takes a few seconds;
            there is nothing you need to do.
          </Typography>
          <Box>
            <Button component={RouterLink} to={bookingHref} variant="text">
              View booking
            </Button>
          </Box>
        </Stack>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Still processing"
      subtitle={bookingRef ? `Booking ${bookingRef}` : undefined}
      icon={<ScheduleIcon />}
      accent="warning"
    >
      <Stack spacing={2.5}>
        <Typography variant="body2">
          {rail} has not confirmed this payment yet. That is normal when a mobile-money prompt is
          answered late or the provider is busy, and it can take a few minutes.
        </Typography>
        <Typography variant="body2">
          {email ? (
            <>
              We&rsquo;ll email <b>{email}</b> the moment it clears
            </>
          ) : (
            <>We&rsquo;ll email you the moment it clears</>
          )}
          , and the booking page updates on its own.{ref}
        </Typography>
        <Alert severity="info">
          Please don&rsquo;t pay again. A second checkout for this booking is refused while this one
          is open, and if this payment does not go through the booking page will offer a fresh one.
        </Alert>
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button onClick={onCheckAgain} variant="outlined" disabled={isChecking}>
              {isChecking ? 'Checking…' : 'Check again'}
            </Button>
            <Button component={RouterLink} to={bookingHref} variant="contained">
              View booking
            </Button>
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );
}
