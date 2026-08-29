import { SectionGrid } from '@sinnapi/ui';
import type { BookingAdminModel } from '@/lib/types';
import BookingFactsCard from './BookingFactsCard';
import BookingPartiesCard from './BookingPartiesCard';

type Props = {
  booking: BookingAdminModel;
  timeWindow: string | null;
};

/**
 * The default section: what this booking is, and who it is between.
 *
 * Two columns from `md` up rather than one long one. The facts take the wider
 * track because their values are dates, an address and a reference number; the
 * parties are names, emails and phone numbers. Side by side they fit a screen
 * together, which is what an operator opening a support thread needs before
 * they read anything else.
 */
export default function OverviewSection({ booking, timeWindow }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
      <BookingFactsCard booking={booking} timeWindow={timeWindow} />
      <BookingPartiesCard booking={booking} />
    </SectionGrid>
  );
}
