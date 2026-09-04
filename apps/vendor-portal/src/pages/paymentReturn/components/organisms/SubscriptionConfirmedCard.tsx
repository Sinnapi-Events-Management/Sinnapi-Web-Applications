import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, InfoRow, SectionCard, Skeleton, Stack } from '@sinnapi/ui';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { NextStepsList } from '@sinnapi/ui/payments';
import { formatDate, formatMoney } from '@/lib/config';
import type { MySubscriptionModel, PaymentReturnModel } from '@/lib/types';

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
 * The period comes from the subscription row, not from the checkout preview:
 * `activate_subscription` wrote it when the IPN landed, and this is the same
 * figure the confirmation email carries.
 */
export default function SubscriptionConfirmedCard({
  payment,
  subscription: s,
  isSubscriptionLoading,
  email,
}: Props) {
  const steps = [
    <>Your public listing is live now. Clients can find and book you straight away.</>,
    s?.current_period_end ? (
      <>
        This period runs to <b>{formatDate(s.current_period_end)}</b>. We will remind you before it
        ends so you can renew in time.
      </>
    ) : (
      <>We will remind you before this period ends so you can renew in time.</>
    ),
    <>Nothing is charged automatically. Every renewal is a payment you open yourself.</>,
    email ? (
      <>
        A receipt is on its way to <b>{email}</b>.
      </>
    ) : (
      <>A receipt is on its way to your email.</>
    ),
  ];

  return (
    <SectionCard
      title="Subscription paid"
      subtitle={s?.plan?.name ? `${s.plan.name} plan` : undefined}
      icon={<CheckCircleIcon />}
      accent="success"
    >
      <Stack spacing={3}>
        <Alert severity="success">
          {formatMoney(payment.amount, payment.currency)} received. Your plan is active.
        </Alert>

        {isSubscriptionLoading || !s ? (
          <Stack spacing={1}>
            <Skeleton height={22} />
            <Skeleton height={22} />
          </Stack>
        ) : (
          <div>
            <InfoRow label="Plan" value={s.plan?.name ?? '—'} />
            <InfoRow label="Period starts" value={formatDate(s.current_period_start)} />
            <InfoRow label="Period ends" value={formatDate(s.current_period_end)} />
          </div>
        )}

        <NextStepsList steps={steps} />

        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to="/subscription" variant="contained">
              View subscription
            </Button>
            <Button component={RouterLink} to="/dashboard" variant="text">
              Go to dashboard
            </Button>
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );
}
