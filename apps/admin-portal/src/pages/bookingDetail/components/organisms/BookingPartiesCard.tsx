import { Divider, SectionCard, Stack } from '@sinnapi/ui';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';
import type { BookingAdminModel } from '@/lib/types';
import PartyRow from '../molecules/PartyRow';

type Props = { booking: BookingAdminModel };

/** Both sides of the booking, with the routes onward to each one's own page. */
export default function BookingPartiesCard({ booking: b }: Props) {
  return (
    <SectionCard title="Parties" icon={<PeopleIcon />} accent="info">
      <Stack spacing={2} divider={<Divider flexItem />}>
        <PartyRow
          role="Vendor"
          party={b.vendor}
          icon={<StorefrontIcon />}
          to={`/vendors/${b.vendor.id}`}
        />
        <PartyRow
          role="Client"
          party={b.client}
          icon={<PersonIcon />}
          to={`/clients/${b.client.id}`}
        />
      </Stack>
    </SectionCard>
  );
}
