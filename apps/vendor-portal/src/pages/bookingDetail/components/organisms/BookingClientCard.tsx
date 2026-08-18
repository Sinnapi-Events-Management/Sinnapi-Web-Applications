import { Stack, InfoRow, SectionCard, Typography } from '@sinnapi/ui';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import type { DirectoryProfile } from '@/lib/types';

type Props = {
  client: DirectoryProfile | null;
};

/**
 * Who the vendor is dealing with. The email carries a copy affordance because
 * the usual next move — mailing the client outside the platform — starts with
 * getting the address somewhere else.
 *
 * On a booking still sitting at `requested` there is no address to copy: the
 * directory withholds contact details until the client has actually engaged, so
 * a vendor cannot harvest an address off a request they have not accepted. That
 * state says so, rather than rendering the empty dash that would read as a
 * client who never supplied one.
 */
export default function BookingClientCard({ client }: Props) {
  const contactWithheld = Boolean(client) && !client?.contact_visible;

  return (
    <SectionCard title="Client" icon={<PersonOutlineIcon />} accent="info">
      <Stack>
        <InfoRow label="Name" icon={<BadgeOutlinedIcon />} value={client?.full_name} />
        <InfoRow
          label="Email"
          icon={<MailOutlineIcon />}
          value={
            contactWithheld ? (
              <Typography component="span" variant="body2" color="text.secondary">
                Shared once the booking is confirmed
              </Typography>
            ) : (
              client?.email
            )
          }
          copyValue={client?.email ?? undefined}
        />
      </Stack>
    </SectionCard>
  );
}
