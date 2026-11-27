import { SectionGrid, Stack } from '@sinnapi/ui';
import { one } from '@/lib/rel';
import type {
  BookingEventModel,
  BookingQuotationModel,
  DirectoryProfile,
  VendorBookingDetailModel,
} from '@/lib/types';
import BookingFactsCard from './BookingFactsCard';
import BookingClientCard from './BookingClientCard';
import BookingEventCard from './BookingEventCard';
import BookingQuotationCard from './BookingQuotationCard';

type Props = {
  booking: VendorBookingDetailModel;
  client: DirectoryProfile | null;
  isClientLoading: boolean;
  timeWindow: string | null;
};

/**
 * The Details tab: the booking's facts and the client, then — when there is
 * one — the event it was for and the quote it came from (formerly the
 * separate "Origin" tab). On a phone everything is one column in that order.
 */
export default function OverviewSection({ booking, client, isClientLoading, timeWindow }: Props) {
  const event = one<BookingEventModel>(booking.events);
  const quotation = one<BookingQuotationModel>(booking.quotations);

  return (
    <Stack spacing={3}>
      <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
        <BookingFactsCard booking={booking} timeWindow={timeWindow} />
        <BookingClientCard client={client} isClientLoading={isClientLoading} />
      </SectionGrid>
      {(event || quotation) && (
        <SectionGrid template={{ xs: '1fr', md: event && quotation ? '5fr 7fr' : '1fr' }}>
          {event && <BookingEventCard booking={booking} />}
          {quotation && <BookingQuotationCard booking={booking} client={client} />}
        </SectionGrid>
      )}
    </Stack>
  );
}
