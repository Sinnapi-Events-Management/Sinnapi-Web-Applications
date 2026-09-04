import { Alert, Box, Button, InfoRow, SectionCard, Skeleton, Stack, StatusChip } from '@sinnapi/ui';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { formatDate, formatDateTime, formatMoney } from '@/lib/config';
import type { MySubscriptionModel } from '@/lib/types';
import { LAPSED_STATUSES } from '../../schema';

type Props = {
  subscription: MySubscriptionModel | null;
  isLoading: boolean;
  /** Opens the checkout for the plan the vendor is on, or the first plan. */
  onRenew: () => void;
};

/**
 * Where the vendor stands: the plan, the period, and the one thing to do
 * about it.
 *
 * Three honest states. On a trial or an active plan the card says when the
 * period ends and that nothing is charged automatically. In grace it says
 * how long is left before the listing is hidden. Expired, it says the listing
 * is hidden and that paying brings it back at once.
 */
export default function CurrentPlanCard({ subscription: s, isLoading, onRenew }: Props) {
  if (isLoading) {
    return (
      <SectionCard title="Your subscription" icon={<WorkspacePremiumIcon />}>
        <Stack spacing={1}>
          <Skeleton height={24} />
          <Skeleton height={24} />
          <Skeleton height={24} />
        </Stack>
      </SectionCard>
    );
  }

  if (!s) {
    return (
      <SectionCard title="Your subscription" icon={<WorkspacePremiumIcon />}>
        <Alert severity="info">
          You do not have a subscription yet. Pick a plan below to get listed.
        </Alert>
      </SectionCard>
    );
  }

  const lapsed = LAPSED_STATUSES.has(s.status);
  const trial = s.status === 'trialing';
  const endsAt = trial ? s.trial_ends_at : s.current_period_end;

  return (
    <SectionCard
      title="Your subscription"
      icon={<WorkspacePremiumIcon />}
      accent={lapsed ? 'warning' : 'success'}
      action={<StatusChip status={s.status} />}
    >
      <Stack spacing={2}>
        {s.status === 'grace' && (
          <Alert severity="warning">
            Your period has ended. Pay before {formatDateTime(s.grace_until)} to keep your public
            listing live.
          </Alert>
        )}
        {(s.status === 'expired' || s.status === 'suspended' || s.status === 'cancelled') && (
          <Alert severity="warning">
            Your public listing is hidden. Pay for a plan and it comes back the moment the payment
            clears; existing bookings are not affected.
          </Alert>
        )}
        {trial && (
          <Alert severity="info">
            You are on a free trial until {formatDate(s.trial_ends_at)}. Choose a plan before then;
            the paid period starts when the trial ends, so you lose none of it by paying early.
          </Alert>
        )}

        <div>
          <InfoRow label="Plan" value={s.plan?.name ?? (trial ? 'Trial' : '—')} />
          {s.plan && (
            <InfoRow
              label="Price"
              value={`${formatMoney(s.plan.price, s.plan.currency)} / ${
                s.plan.billing_cycle === 'annual' ? 'year' : 'month'
              }`}
            />
          )}
          {!trial && s.current_period_start && (
            <InfoRow label="Period started" value={formatDate(s.current_period_start)} />
          )}
          <InfoRow label={trial ? 'Trial ends' : 'Period ends'} value={formatDate(endsAt)} />
          <InfoRow
            label="Renewal"
            value={
              s.auto_renew
                ? 'We remind you before the period ends. Nothing is charged automatically.'
                : 'Reminders are off. Nothing is charged automatically.'
            }
          />
        </div>

        <Box>
          <Button variant={lapsed ? 'contained' : 'outlined'} onClick={onRenew}>
            {lapsed ? 'Pay and reactivate' : trial ? 'Choose a plan' : 'Renew now'}
          </Button>
        </Box>
      </Stack>
    </SectionCard>
  );
}
