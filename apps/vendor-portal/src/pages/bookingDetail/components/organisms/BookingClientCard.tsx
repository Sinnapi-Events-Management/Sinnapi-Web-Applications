import { Stack, InfoRow, SectionCard } from '@sinnapi/ui';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import type { ProfileContactRel } from '@/lib/types';

type Props = {
  client: ProfileContactRel | null;
};

/**
 * Who the vendor is dealing with. The email carries a copy affordance because
 * the usual next move — mailing the client outside the platform — starts with
 * getting the address somewhere else.
 */
export default function BookingClientCard({ client }: Props) {
  return (
    <SectionCard title="Client" icon={<PersonOutlineIcon />} accent="info">
      <Stack>
        <InfoRow label="Name" icon={<BadgeOutlinedIcon />} value={client?.full_name} />
        <InfoRow
          label="Email"
          icon={<MailOutlineIcon />}
          value={client?.email}
          copyValue={client?.email ?? undefined}
        />
      </Stack>
    </SectionCard>
  );
}
