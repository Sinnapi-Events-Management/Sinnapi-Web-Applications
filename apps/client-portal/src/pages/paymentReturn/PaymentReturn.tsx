import { PageTitle, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { checkoutRailLabel } from '@sinnapi/ui/payments';
import { usePaymentReturn } from './hooks/usePaymentReturn';
import PaymentConfirmedCard from './components/organisms/PaymentConfirmedCard';
import PaymentPendingCard from './components/organisms/PaymentPendingCard';
import PaymentFailedCard from './components/organisms/PaymentFailedCard';
import PaymentCancelledCard from './components/organisms/PaymentCancelledCard';
import SubscriptionOutcomeCard from './components/organisms/SubscriptionOutcomeCard';

/**
 * Where the payment provider sends the browser after a hosted checkout.
 *
 * `PESAPAL_CALLBACK_URL` points here. Nothing on the query string is believed
 * about the outcome — `usePaymentReturn` reads our own payment row through
 * RLS and decides which of three honest states to show: the money is in, the
 * provider has not said yet, or it said no. It also reads what the payment
 * was *for*: an escrow funding gets the booking-shaped cards, a subscription
 * gets its own, and nothing here assumes one or the other. Routing only.
 *
 * The page sets no width of its own. Each outcome card wraps itself in
 * `OutcomeLayout`, which owns the measure — a clamp here as well was how the
 * confirmed card ended up centred inside 760px on a 1440px page, with the
 * whole right half of the screen empty.
 *
 * Sits inside the protected shell, so a client whose session lapsed during
 * checkout is sent through sign-in and back to this exact URL, query string
 * included, by `ProtectedRoute`.
 */
export default function PaymentReturn() {
  const r = usePaymentReturn();
  const isSubscription = r.purpose === 'subscription';

  return (
    <>
      <PageTitle title="Payment" subtitle={r.subtitle} />

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

          {/* A subscription payment that landed here rather than on the vendor
              portal's return route. Every outcome of it, including a cancel
              that left a readable row, is told by the one card that knows not
              to send a vendor to /bookings. */}
          {isSubscription && r.payment && r.state !== 'loading' && r.state !== 'not_found' && (
            <SubscriptionOutcomeCard
              state={r.state}
              payment={r.payment}
              email={r.email}
              onCheckAgain={r.checkAgain}
              isChecking={r.isChecking}
            />
          )}

          {/* Cancelled with no row at all — the cancel URL carried no pid, or
              RLS hides it — so there is nothing to say what it was for. */}
          {r.state === 'cancelled' && !r.payment && (
            <PaymentCancelledCard bookingRef={null} bookingHref="/bookings" />
          )}

          {!isSubscription && r.payment && (
            <>
              {r.state === 'cancelled' && (
                <PaymentCancelledCard bookingRef={r.bookingRef} bookingHref={r.bookingHref} />
              )}

              {r.state === 'confirmed' && (
                <PaymentConfirmedCard
                  payment={r.payment}
                  escrow={r.escrow}
                  isEscrowLoading={r.isEscrowLoading}
                  bookingRef={r.bookingRef}
                  bookingHref={r.bookingHref}
                  email={r.email}
                />
              )}

              {(r.state === 'checking' || r.state === 'processing') && (
                <PaymentPendingCard
                  phase={r.state}
                  payment={r.payment}
                  rail={checkoutRailLabel(r.payment.provider, r.payment.provider_method)}
                  bookingRef={r.bookingRef}
                  bookingHref={r.bookingHref}
                  email={r.email}
                  onCheckAgain={r.checkAgain}
                  isChecking={r.isChecking}
                />
              )}

              {r.state === 'failed' && (
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
    </>
  );
}
