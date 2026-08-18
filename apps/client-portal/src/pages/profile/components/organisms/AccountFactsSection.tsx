import { Button } from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import { AccountFactsCard, type AccountFact } from '@sinnapi/ui/profile';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import MailIcon from '@mui/icons-material/MailOutline';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserOutlined';
import { formatDate } from '@/lib/config';
import type { ProfileModel } from '@/lib/types';

type Props = {
  profile: ProfileModel;
};

/**
 * Read-only account facts.
 *
 * Everything here is set by the platform rather than the account holder, so it is
 * presented as information rather than as fields that merely happen to be
 * disabled — a disabled input invites the user to hunt for whatever would enable
 * it, where a stated fact does not.
 *
 * The header action is the other half of that: this page has no password control
 * (Settings owns it, and one control in two places is one too many), so the card
 * links there rather than leaving the user to find it.
 *
 * Two-step verification is reported but not offered: `profiles.mfa_enabled` is a
 * real column, and saying where the account stands is honest, but no portal enrols
 * a factor yet — so there is deliberately no toggle beside it.
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
      key: 'mfa',
      label: 'Two-step verification',
      icon: <VerifiedUserIcon />,
      value: profile.mfa_enabled ? 'Enabled' : 'Not enabled',
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
      note="Your email is your account identity and can't be changed here — contact support if it needs to move. Change your password under Settings."
    />
  );
}
