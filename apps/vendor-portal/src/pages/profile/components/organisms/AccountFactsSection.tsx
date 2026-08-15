import { Button } from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import { AccountFactsCard, type AccountFact } from '@sinnapi/ui/profile';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import MailIcon from '@mui/icons-material/MailOutline';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import { formatDate } from '@/lib/config';
import type { ProfileModel } from '@/lib/types';

type Props = {
  profile: ProfileModel;
};

/**
 * Read-only facts about the vendor's own account, as distinct from the listing
 * facts on the Business tab. Presented as information rather than disabled fields:
 * a disabled input invites the user to hunt for whatever would enable it.
 *
 * The header action links to Settings, which owns the password and payout banking.
 * This page deliberately holds no copy of either — the same arrangement as the
 * client portal, so a vendor who also holds a client account finds the two in the
 * same place.
 */
export default function AccountFactsSection({ profile }: Props) {
  const facts: AccountFact[] = [
    {
      key: 'email',
      label: 'Email',
      icon: <MailIcon />,
      value: profile.email,
      copyValue: profile.email ?? undefined,
    },
    {
      key: 'created',
      label: 'Member since',
      icon: <CalendarIcon />,
      value: profile.created_at ? formatDate(profile.created_at) : undefined,
    },
    {
      key: 'id',
      label: 'Account ID',
      icon: <BadgeIcon />,
      value: profile.id,
      copyValue: profile.id,
      mono: true,
    },
  ];

  return (
    <AccountFactsCard
      facts={facts}
      icon={<ShieldIcon />}
      action={
        <Button component={AppLink} to="/settings" size="small" sx={{ flexShrink: 0 }}>
          Security
        </Button>
      }
      note="Your email is your account identity and can't be changed here — contact support if it needs to move. Password and payout banking live under Settings."
    />
  );
}
