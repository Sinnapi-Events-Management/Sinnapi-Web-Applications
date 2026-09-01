import { Divider, SectionCard, Stack } from '@sinnapi/ui';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';
import PartyRow from '@/pages/bookingDetail/components/molecules/PartyRow';
import type { AdminQuotationDetailModel } from '@/lib/types';

type Props = { quotation: AdminQuotationDetailModel };

/**
 * Both sides of the quote, with the routes onward to each one's own page.
 *
 * `PartyRow` is the booking page's, reused rather than copied: it is the same
 * two people, asked the same question, and support's next move after opening
 * either page is to contact one of them. Both models resolve to
 * `ConsolePartyModel`, which is what makes the reuse a shared type rather than
 * a coincidence.
 */
export default function QuotationPartiesCard({ quotation: q }: Props) {
  return (
    <SectionCard title="Parties" icon={<PeopleIcon />} accent="info">
      <Stack spacing={2} divider={<Divider flexItem />}>
        <PartyRow
          role="Vendor"
          party={q.vendor}
          icon={<StorefrontIcon />}
          to={`/vendors/${q.vendor.id}`}
        />
        <PartyRow
          role="Client"
          party={q.client}
          icon={<PersonIcon />}
          to={`/clients/${q.client.id}`}
        />
      </Stack>
    </SectionCard>
  );
}
