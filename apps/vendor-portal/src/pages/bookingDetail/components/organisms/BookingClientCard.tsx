import { ContactRows, Stack, InfoRow, SectionCard } from '@sinnapi/ui';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import type { DirectoryProfile } from '@/lib/types';

type Props = {
  client: DirectoryProfile | null;
  isClientLoading: boolean;
};

/**
 * Who the vendor is dealing with, and how to reach them. The email and phone
 * carry copy affordances because the usual next move — contacting the client
 * outside the platform — starts with getting the number or address somewhere
 * else.
 *
 * On a booking still sitting at `requested` there is no contact to copy: the
 * directory withholds details until the booking is past that state, so a vendor
 * cannot harvest a number off a request they have not accepted. The rows say so,
 * rather than rendering the empty dash that would read as a client who never
 * supplied one. The rule itself lives in `get_profile_directory`; this card only
 * shows its result.
 */
export default function BookingClientCard({ client, isClientLoading }: Props) {
  return (
    <SectionCard title="Client" icon={<PersonOutlineIcon />} accent="info">
      <Stack>
        <InfoRow label="Name" icon={<BadgeOutlinedIcon />} value={client?.full_name} />
        <ContactRows
          email={client?.email}
          phone={client?.phone}
          visible={Boolean(client?.contact_visible)}
          unresolved={isClientLoading || !client}
          withheldNote="Shared once the booking is confirmed"
        />
      </Stack>
    </SectionCard>
  );
}
