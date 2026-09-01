import { StatusChip } from '@sinnapi/ui';
import { AccountFactsCard, type AccountFact } from '@sinnapi/ui/profile';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import MailIcon from '@mui/icons-material/MailOutline';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import { formatDate } from '@/lib/config';
import { useVendorContext } from '@/vendor/VendorProvider';
import type { ProfileModel } from '@/lib/types';

type Props = {
  /** The profile the page has already resolved — this card never fetches. */
  profile?: ProfileModel | null;
};

/**
 * Who this page is about, in four facts.
 *
 * The page's cards each act on one thing — a bank account, a password, a data
 * request — and none of them says whose account is being acted on beyond the
 * email in the security card. That was tolerable when the page was one narrow
 * column; beside a rail it would be wasted width, and a vendor about to reroute a
 * payout or file an erasure request is exactly the person who wants the account
 * named in front of them first.
 *
 * It is the profile kit's `AccountFactsCard` rather than a card of its own: the
 * facts are the same facts, read-only for the same reason, and the profile page
 * already answers the "why can't I edit this here" question in the same shape.
 * The header chip is the one addition — approval status is what decides whether
 * the payout card below renders a form or the onboarding prompt, so a vendor
 * looking at that prompt can see why without leaving the page.
 */
export default function AccountGlanceCard({ profile }: Props) {
  const { vendor } = useVendorContext();

  const facts: AccountFact[] = [
    ...(vendor
      ? [
          {
            key: 'business',
            label: 'Business',
            icon: <StorefrontIcon />,
            value: vendor.business_name,
          },
        ]
      : []),
    {
      key: 'email',
      label: 'Email',
      icon: <MailIcon />,
      value: profile?.email,
      copyValue: profile?.email ?? undefined,
    },
    {
      key: 'created',
      label: 'Member since',
      icon: <CalendarIcon />,
      value: profile?.created_at ? formatDate(profile.created_at) : undefined,
    },
    {
      key: 'id',
      label: 'Account ID',
      icon: <BadgeIcon />,
      value: profile?.public_id,
      copyValue: profile?.public_id ?? undefined,
      mono: true,
    },
  ];

  return (
    <AccountFactsCard
      facts={facts}
      icon={<ShieldIcon />}
      accent="secondary"
      action={vendor ? <StatusChip status={vendor.status} /> : undefined}
      note="Set by the platform. Your name, phone and photo are edited on the Profile page."
    />
  );
}
