import { Box } from '@sinnapi/ui';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import LoginIcon from '@mui/icons-material/LoginOutlined';
import MailIcon from '@mui/icons-material/MailOutline';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import SectionCard from '@/components/ui/SectionCard';
import InfoRow from '@/components/ui/InfoRow';
import { formatDate, formatDateTime } from '@/lib/config';
import type { ProfileModel } from '@/lib/types';

type Props = {
  profile: ProfileModel;
};

/**
 * Read-only account facts. Everything here is set by the platform rather than
 * the account holder — the email is the account identity, status is owned by the
 * Users page's block/activate flow, the timestamps by the system — so it is
 * deliberately presented as information rather than as fields that merely happen
 * to be disabled.
 */
export default function AccountSummaryCard({ profile }: Props) {
  return (
    <SectionCard title="Account" icon={<ShieldIcon />} accent="primary">
      <Box>
        <InfoRow
          label="Email"
          icon={<MailIcon />}
          value={profile.email}
          copyValue={profile.email ?? undefined}
        />
        <InfoRow
          label="Member since"
          icon={<CalendarIcon />}
          value={profile.created_at ? formatDate(profile.created_at) : undefined}
        />
        <InfoRow
          label="Last sign-in"
          icon={<LoginIcon />}
          value={profile.last_login_at ? formatDateTime(profile.last_login_at) : 'This session'}
        />
        <InfoRow
          label="Account ID"
          icon={<BadgeIcon />}
          value={profile.id}
          copyValue={profile.id}
          mono
        />
      </Box>
    </SectionCard>
  );
}
