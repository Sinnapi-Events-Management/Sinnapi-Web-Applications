import { SectionGrid, Stack } from '@sinnapi/ui';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useMoneySection } from '../../hooks/useMoneySection';
import MoneySummaryCard from './MoneySummaryCard';
import BookingSettlementCard from './BookingSettlementCard';
import BookingPaymentCard from './BookingPaymentCard';
import BookingAgreementCard from './BookingAgreementCard';
import BookingInvoiceCard from './BookingInvoiceCard';

type Props = { booking: VendorBookingDetailModel };

/**
 * The side rail sticks under the app bar only on windows wide enough for two
 * columns *and* tall enough to show the whole rail. A sticky column taller than
 * the viewport hides its own bottom, so on a short window it scrolls with the
 * page instead — the same rule the profile pages use.
 */
const railSx = {
  minWidth: 0,
  '@media (min-width: 1200px) and (min-height: 900px)': {
    position: 'sticky',
    top: 88,
  },
} as const;

/**
 * Everything about the money, in three bands.
 *
 * 1. **The summary** — how much was agreed, how much is already yours, how
 *    much is held and how much the client still owes. Stated once, here.
 * 2. **The main column** — what is happening to the money: the post-event
 *    payout request (the only card here that asks something of the vendor,
 *    so it comes first) and the live journey of the funds.
 * 3. **The side rail** — the record behind it: what was agreed and the
 *    invoice. Reference material, so it sits beside the story rather than in
 *    its way, and stays in view on a large screen.
 *
 * Below `lg` the two columns stack in that same order, so a phone reads
 * summary → action → status → agreement → invoice.
 *
 * A direct booking has no payout request and no escrow, so there is no main
 * column to fill: the record cards sit side by side under the summary instead
 * of leaving an empty track beside them.
 */
export default function MoneySection({ booking }: Props) {
  const money = useMoneySection(booking);
  const record = (
    <>
      <BookingAgreementCard booking={booking} escrowSection={money.escrowSection} />
      <BookingInvoiceCard booking={booking} />
    </>
  );

  return (
    <Stack spacing={3}>
      <MoneySummaryCard money={money} />

      {money.rail === 'direct' ? (
        <SectionGrid>{record}</SectionGrid>
      ) : (
        <SectionGrid template={{ xs: '1fr', lg: 'minmax(0, 7fr) minmax(0, 5fr)' }}>
          <Stack spacing={3} sx={{ minWidth: 0 }}>
            <BookingSettlementCard booking={booking} />
            <BookingPaymentCard booking={booking} section={money.escrowSection} />
          </Stack>
          <Stack spacing={3} sx={railSx}>
            {record}
          </Stack>
        </SectionGrid>
      )}
    </Stack>
  );
}
