import { SectionGrid } from '@sinnapi/ui';
import type { DirectoryProfile, VendorBookingDetailModel } from '@/lib/types';
import BookingFactsCard from './BookingFactsCard';
import BookingClientCard from './BookingClientCard';

type Props = {
  booking: VendorBookingDetailModel;
  client: DirectoryProfile | null;
  timeWindow: string | null;
};

/**
 * The default section: what this booking is, and who it is with.
 *
 * Two columns from `md` up rather than one long one — the facts are a list of
 * short rows and the client is two of them, so side by side they fit a screen
 * together and neither has to be scrolled to. The facts take the wider track
 * because their values are dates, addresses and a reference number; the
 * client's are a name and an email.
 */
export default function OverviewSection({ booking, client, timeWindow }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
      <BookingFactsCard booking={booking} timeWindow={timeWindow} />
      <BookingClientCard client={client} />
    </SectionGrid>
  );
}
