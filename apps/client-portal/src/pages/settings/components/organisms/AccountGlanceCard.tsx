import { AccountFactsCard, type AccountFact } from '@sinnapi/ui/profile';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import MailIcon from '@mui/icons-material/MailOutline';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserOutlined';
import { formatDate } from '@/lib/config';
import type { ProfileModel } from '@/lib/types';

type Props = {
  /** The profile the page has already resolved — this card never fetches. */
  profile?: ProfileModel | null;
};

/**
 * Who this page is about, in four facts.
 *
 * Same card, same facts and the same reasoning as the vendor portal's rail — see
 * that copy for why the width beside the cards is spent on identifying the
 * account rather than on wider inputs. Two-step verification is reported here and
 * not there because the client profile reads `mfa_enabled`; it is stated, never
 * offered, for the reason `SecuritySection` gives — no portal enrols a factor yet.
 */
export default function AccountGlanceCard({ profile }: Props) {
  const facts: AccountFact[] = [
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
      key: 'mfa',
      label: 'Two-step verification',
      icon: <VerifiedUserIcon />,
      value: profile ? (profile.mfa_enabled ? 'Enabled' : 'Not enabled') : undefined,
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
      note="Set by the platform. Your name, phone and photo are edited on the Profile page."
    />
  );
}
