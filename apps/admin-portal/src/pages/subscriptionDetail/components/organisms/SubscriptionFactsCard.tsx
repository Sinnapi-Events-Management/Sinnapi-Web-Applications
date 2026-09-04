import { Alert, InfoRow, SectionCard, Stack, StatusChip } from '@sinnapi/ui';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { formatDate, formatDateTime, formatMoney } from '@/lib/config';
import type { SubscriptionAdminDetailModel } from '@/lib/types';

type Props = { subscription: SubscriptionAdminDetailModel };

/**
 * The subscription row itself, as labelled facts.
 *
 * The renewal rows are here because they explain the state: a vendor in
 * grace who was reminded three times is a different case from one who was
 * never reminded at all, and the second is exactly the one the sweep refuses
 * to hide without a person looking.
 */
export default function SubscriptionFactsCard({ subscription: s }: Props) {
  return (
    <SectionCard
      title="Subscription"
      icon={<WorkspacePremiumIcon />}
      action={<StatusChip status={s.status} />}
    >
      <Stack spacing={2}>
        {s.hide_blocked_at && (
          <Alert severity="warning" variant="outlined">
            Expired on {formatDateTime(s.hide_blocked_at)} without the vendor ever being prompted to
            renew, so the listing was <b>not</b> hidden. Decide whether to hide the vendor or reach
            out; the flag clears itself if they pay.
          </Alert>
        )}

        <div>
          <InfoRow label="Plan" value={s.plan?.name ?? (s.status === 'trialing' ? 'Trial' : '—')} />
          {s.plan && (
            <InfoRow
              label="Price"
              value={`${formatMoney(s.plan.price, s.plan.currency)} / ${
                s.plan.billing_cycle === 'annual' ? 'year' : 'month'
              }${s.plan.is_active ? '' : ' (plan retired)'}`}
            />
          )}
          <InfoRow label="Period start" value={formatDate(s.current_period_start)} />
          <InfoRow label="Period end" value={formatDate(s.current_period_end)} />
          <InfoRow label="Trial ends" value={formatDate(s.trial_ends_at)} />
          <InfoRow label="Grace until" value={formatDateTime(s.grace_until)} />
          {s.cancelled_at && <InfoRow label="Cancelled" value={formatDateTime(s.cancelled_at)} />}
        </div>

        <div>
          <InfoRow
            label="Renewal reminders"
            value={s.auto_renew ? 'On — vendor is reminded before the period ends' : 'Off'}
          />
          <InfoRow
            label="Last reminder"
            value={
              s.last_renewal_reminder_day != null
                ? `${s.last_renewal_reminder_day} day${s.last_renewal_reminder_day === 1 ? '' : 's'} before end`
                : 'None this period'
            }
          />
          <InfoRow
            label="First prompted"
            value={s.renewal_prompted_at ? formatDateTime(s.renewal_prompted_at) : 'Never'}
          />
        </div>

        <div>
          <InfoRow label="Subscription ID" value={s.id} mono copyValue={s.id} />
          <InfoRow label="Created" value={formatDateTime(s.created_at)} />
          <InfoRow label="Last updated" value={formatDateTime(s.updated_at)} />
        </div>
      </Stack>
    </SectionCard>
  );
}
