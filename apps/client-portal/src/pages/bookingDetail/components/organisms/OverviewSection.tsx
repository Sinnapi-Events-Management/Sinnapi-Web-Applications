import { SectionGrid } from '@sinnapi/ui';
import type { BookingDetailModel, VendorRefModel } from '@/lib/types';
import BookingFactsCard from './BookingFactsCard';
import BookingVendorCard from './BookingVendorCard';

type Props = {
  booking: BookingDetailModel;
  vendor: VendorRefModel | null;
  timeWindow: string | null;
};

/**
 * The default section: what this booking is, and who it is with.
 *
 * Two columns from `md` up rather than one long one — the facts are a list of
 * short rows and the vendor is a name and a link, so side by side they fit a
 * screen together and neither has to be scrolled to. The facts take the wider
 * track because their values are dates, addresses and a reference number.
 */
export default function OverviewSection({ booking, vendor, timeWindow }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
      <BookingFactsCard booking={booking} timeWindow={timeWindow} />
      <BookingVendorCard vendor={vendor} />
    </SectionGrid>
  );
}
