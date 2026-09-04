import { HeroMetaSection } from '@sinnapi/ui';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import EventIcon from '@mui/icons-material/Event';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { formatDate, formatDateTime, formatMoney } from '@/lib/config';
import type { SubscriptionAdminDetailModel } from '@/lib/types';

type Props = { subscription: SubscriptionAdminDetailModel };

/**
 * The facts worth reading before scrolling: the plan and its price, when the
 * period ends, and the two states that need a person — grace running out,
 * and a hide that was withheld. Mapping only — `HeroMetaSection` owns the
 * layout and drops the entries that come back falsy.
 */
export default function SubscriptionHeroMeta({ subscription: s }: Props) {
  const trial = s.status === 'trialing';
  const endsAt = trial ? s.trial_ends_at : s.current_period_end;

  return (
    <HeroMetaSection
      facts={[
        s.plan && {
          icon: <WorkspacePremiumIcon />,
          text: `${s.plan.name} · ${formatMoney(s.plan.price, s.plan.currency)} / ${
            s.plan.billing_cycle === 'annual' ? 'year' : 'month'
          }`,
        },
        endsAt && {
          icon: <EventIcon />,
          text: `${trial ? 'Trial ends' : 'Period ends'} ${formatDate(endsAt)}`,
        },
        s.status === 'grace' &&
          s.grace_until && {
            icon: <HourglassBottomIcon />,
            text: `Grace until ${formatDateTime(s.grace_until)}`,
          },
        s.hide_blocked_at && {
          icon: <VisibilityOffIcon />,
          text: `Hide withheld ${formatDateTime(s.hide_blocked_at)} — needs review`,
        },
        {
          icon: <NotificationsActiveIcon />,
          text: s.auto_renew ? 'Renewal reminders on' : 'Renewal reminders off',
          secondary: true,
        },
      ]}
    />
  );
}
