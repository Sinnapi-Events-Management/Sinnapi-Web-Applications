import { Link as RouterLink } from 'react-router-dom';
import { Button, Skeleton, Stack, Typography } from '@sinnapi/ui';
import {
  NextStepsList,
  OutcomeActions,
  OutcomeCard,
  OutcomeHeader,
  OutcomeLayout,
  PaymentFactsPanel,
  ReceiptTotal,
} from '@sinnapi/ui/payments';
import type { MySubscriptionModel, PaymentReturnModel } from '@/lib/types';
import { useSubscriptionConfirmed } from '../../hooks/useSubscriptionConfirmed';

type Props = {
  payment: PaymentReturnModel;
  subscription: MySubscriptionModel | null;
  isSubscriptionLoading: boolean;
  email: string | null;
};

/**
 * The money is in and the plan is active. What was paid, the period it
 * bought, and what the vendor should expect without doing anything.
 *
 * Laid out on the same frame as the client's escrow confirmation, with the
 * period in the rail where the client gets a receipt: two different payments
 * with the same four endings, told in one visual language rather than two
 * that drift apart the first time either is restyled.
 */
export default function SubscriptionConfirmedCard({
  payment,
  subscription,
  isSubscriptionLoading,
  email,
}: Props) {
  const { steps, facts, planName, totalAmount } = useSubscriptionConfirmed({
    payment,
    subscription,
    email,
  });

  return (
    <OutcomeLayout
      header={
        <OutcomeHeader
          accent="success"
          title="Subscription paid"
          reference={planName ? `${planName} plan` : undefined}
          description="Your listing is live and your period has started."
        />
      }
      aside={
        isSubscriptionLoading && facts.length === 0 ? (
          <PeriodSkeleton />
        ) : (
          <PaymentFactsPanel
            title="Your plan"
            facts={facts}
            footer={
              <Stack spacing={1.5} sx={{ pt: 1 }}>
                <ReceiptTotal label="Paid" amount={totalAmount} size="inline" />
                <Typography variant="caption" color="text.secondary">
                  Nothing renews automatically. Every renewal is a payment you open yourself.
                </Typography>
              </Stack>
            }
          />
        )
      }
    >
      <OutcomeCard accent="success">
        <NextStepsList steps={steps} accent="success" />
        <OutcomeActions>
          <Button component={RouterLink} to="/subscription" variant="contained" size="large">
            View subscription
          </Button>
          <Button component={RouterLink} to="/dashboard" variant="outlined" size="large">
            Go to dashboard
          </Button>
        </OutcomeActions>
      </OutcomeCard>
    </OutcomeLayout>
  );
}

/**
 * The rail while the subscription row is still in flight.
 *
 * Shaped like the panel it stands in for — a label and three key/value rows —
 * so the period dates do not shift down the page as they arrive.
 */
function PeriodSkeleton() {
  return (
    <Stack
      spacing={1.5}
      sx={{
        borderRadius: 4,
        p: { xs: 2.5, sm: 3 },
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Skeleton width={70} height={14} />
      <Skeleton height={22} />
      <Skeleton height={22} />
      <Skeleton height={22} />
    </Stack>
  );
}
