import { Box, PageTitle, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { checkoutRailLabel } from '@sinnapi/ui/payments';
import { usePaymentReturn } from './hooks/usePaymentReturn';
import PaymentConfirmedCard from './components/organisms/PaymentConfirmedCard';
import PaymentPendingCard from './components/organisms/PaymentPendingCard';
import PaymentFailedCard from './components/organisms/PaymentFailedCard';
import SubscriptionOutcomeCard from './components/organisms/SubscriptionOutcomeCard';

/**
 * Where the payment provider sends the browser after a hosted checkout.
 *
 * `PESAPAL_CALLBACK_URL` points here. Nothing on the query string is believed
 * about the outcome — `usePaymentReturn` reads our own payment row through
 * RLS and decides which of three honest states to show: the money is in, the
 * provider has not said yet, or it said no. It also reads what the payment
 * was *for*: an escrow funding gets the booking-shaped cards, a subscription
 * gets its own, and nothing here assumes one or the other. Layout only.
 *
 * Sits inside the protected shell, so a client whose session lapsed during
 * checkout is sent through sign-in and back to this exact URL, query string
 * included, by `ProtectedRoute`.
 */
export default function PaymentReturn() {
  const r = usePaymentReturn();

  const subtitle =
    r.state === 'confirmed'
      ? r.purpose === 'subscription'
        ? 'Your plan is active.'
        : 'Your money is secured.'
      : r.state === 'failed'
        ? 'This payment did not go through.'
        : 'Checking on your payment.';

  return (
    <>
      <PageTitle title="Payment" subtitle={subtitle} />

      <Box sx={{ maxWidth: 760 }}>
        {r.state === 'invalid' ? (
          <EmptyState
            title="This link is incomplete"
            description="The payment provider did not tell us which payment this is. Open the booking to see where it stands."
            ctaLabel="Go to bookings"
            ctaHref="/bookings"
          />
        ) : (
          <QueryState isLoading={r.state === 'loading'} error={r.error}>
            {r.state === 'not_found' && (
              <EmptyState
                title="We couldn't find this payment"
                description="It may belong to a different account, or the link may have been altered. Your bookings show every payment on your account."
                ctaLabel="Go to bookings"
                ctaHref="/bookings"
              />
            )}

            {r.payment &&
              r.purpose === 'subscription' &&
              (r.state === 'confirmed' ||
                r.state === 'failed' ||
                r.state === 'checking' ||
                r.state === 'processing') && (
                <SubscriptionOutcomeCard
                  state={r.state}
                  payment={r.payment}
                  email={r.email}
                  onCheckAgain={r.checkAgain}
                  isChecking={r.isChecking}
                />
              )}

            {r.purpose !== 'subscription' && (
              <>
                {r.state === 'confirmed' && r.payment && (
                  <PaymentConfirmedCard
                    payment={r.payment}
                    escrow={r.escrow}
                    isEscrowLoading={r.isEscrowLoading}
                    bookingRef={r.bookingRef}
                    bookingHref={r.bookingHref}
                    email={r.email}
                  />
                )}

                {(r.state === 'checking' || r.state === 'processing') && r.payment && (
                  <PaymentPendingCard
                    phase={r.state}
                    rail={checkoutRailLabel(r.payment.provider, r.payment.provider_method)}
                    bookingRef={r.bookingRef}
                    bookingHref={r.bookingHref}
                    email={r.email}
                    onCheckAgain={r.checkAgain}
                    isChecking={r.isChecking}
                  />
                )}

                {r.state === 'failed' && r.payment && (
                  <PaymentFailedCard
                    payment={r.payment}
                    bookingRef={r.bookingRef}
                    bookingHref={r.bookingHref}
                  />
                )}
              </>
            )}
          </QueryState>
        )}
      </Box>
    </>
  );
}
