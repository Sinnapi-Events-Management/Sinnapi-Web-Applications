import { AccountFactsCard, type AccountFact } from '@sinnapi/ui/profile';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import LoginIcon from '@mui/icons-material/LoginOutlined';
import MailIcon from '@mui/icons-material/MailOutline';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import { formatDate, formatDateTime } from '@/lib/config';
import type { ProfileModel } from '@/lib/types';

type Props = {
  profile: ProfileModel;
};

/**
 * Read-only account facts. Everything here is set by the platform rather than the
 * account holder — the email is the account identity, status is owned by the Users
 * page's block/activate flow, the timestamps by the system.
 */
export default function AccountSummaryCard({ profile }: Props) {
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
      key: 'last-login',
      label: 'Last sign-in',
      icon: <LoginIcon />,
      value: profile.last_login_at ? formatDateTime(profile.last_login_at) : 'This session',
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

  return <AccountFactsCard facts={facts} icon={<ShieldIcon />} />;
}
