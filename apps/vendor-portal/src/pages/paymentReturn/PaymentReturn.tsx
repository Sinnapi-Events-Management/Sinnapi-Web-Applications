import { Box, PageTitle, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { checkoutRailLabel } from '@sinnapi/ui/payments';
import { usePaymentReturn } from './hooks/usePaymentReturn';
import SubscriptionConfirmedCard from './components/organisms/SubscriptionConfirmedCard';
import PaymentPendingCard from './components/organisms/PaymentPendingCard';
import PaymentFailedCard from './components/organisms/PaymentFailedCard';

/**
 * Where the payment provider sends the browser after a subscription checkout.
 *
 * `create-payment` points Pesapal here (VENDOR_PORTAL_URL + /payments/return)
 * for subscription orders. Nothing on the query string is believed about the
 * outcome — `usePaymentReturn` reads our own payment row through RLS and
 * shows one of three honest states. Layout only.
 *
 * Sits inside the vendor shell, so a vendor whose session lapsed during
 * checkout is sent through sign-in and back to this exact URL.
 */
export default function PaymentReturn() {
  const r = usePaymentReturn();

  return (
    <>
      <PageTitle
        title="Payment"
        subtitle={
          r.state === 'confirmed'
            ? 'Your plan is active.'
            : r.state === 'failed'
              ? 'This payment did not go through.'
              : 'Checking on your payment.'
        }
      />

      <Box sx={{ maxWidth: 760 }}>
        {r.state === 'invalid' ? (
          <EmptyState
            title="This link is incomplete"
            description="The payment provider did not tell us which payment this is. Your subscription page shows where things stand."
            ctaLabel="Go to subscription"
            ctaHref="/subscription"
          />
        ) : (
          <QueryState isLoading={r.state === 'loading'} error={r.error}>
            {r.state === 'not_found' && (
              <EmptyState
                title="We couldn't find this payment"
                description="It may belong to a different account, or the link may have been altered. Your subscription page lists every payment on your account."
                ctaLabel="Go to subscription"
                ctaHref="/subscription"
              />
            )}

            {r.state === 'confirmed' && r.payment && (
              <SubscriptionConfirmedCard
                payment={r.payment}
                subscription={r.subscription}
                isSubscriptionLoading={r.isSubscriptionLoading}
                email={r.email}
              />
            )}

            {(r.state === 'checking' || r.state === 'processing') && r.payment && (
              <PaymentPendingCard
                phase={r.state}
                rail={checkoutRailLabel(r.payment.provider, r.payment.provider_method)}
                email={r.email}
                onCheckAgain={r.checkAgain}
                isChecking={r.isChecking}
              />
            )}

            {r.state === 'failed' && r.payment && <PaymentFailedCard payment={r.payment} />}
          </QueryState>
        )}
      </Box>
    </>
  );
}
