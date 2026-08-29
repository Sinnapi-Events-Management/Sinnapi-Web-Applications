import { HeroMetaSection, type QuotationPricing } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CelebrationIcon from '@mui/icons-material/Celebration';
import SendIcon from '@mui/icons-material/Send';
import { formatDate, formatMoney } from '@/lib/config';
import type { EventRefModel, QuotationDetailModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  event: EventRefModel | null;
  pricing: QuotationPricing;
};

/**
 * The facts worth reading before scrolling: what it costs, how long the price
 * holds, which event it is for and when it was sent.
 *
 * The total is omitted entirely on an unpriced quote rather than shown as a
 * zero. A client whose vendor has not answered yet must never read "UGX 0" in
 * the largest text on the page.
 *
 * Only the money survives on a phone. The other three are marked `secondary`
 * and drop below `md`, because the hero and the tab bar together were eating
 * most of a small screen before the first section began — and all three are
 * labelled rows on the Overview tab, one tap away and better presented there
 * than as a wrapping icon strip. On an unpriced quote nothing primary is left,
 * and `HeroMetaSection` then drops the whole strip and its divider rather than
 * ruling a line under an empty row.
 */
export default function QuotationHeroMeta({ quotation: q, event, pricing }: Props) {
  return (
    <HeroMetaSection
      facts={[
        pricing.isPriced && {
          icon: <PaymentsIcon />,
          text: formatMoney(pricing.total, pricing.currency),
        },
        q.valid_until && {
          icon: <EventAvailableIcon />,
          text: `Valid until ${formatDate(q.valid_until)}`,
          secondary: true,
        },
        event?.title && { icon: <CelebrationIcon />, text: event.title, secondary: true },
        q.sent_at && {
          icon: <SendIcon />,
          text: `Sent ${formatDate(q.sent_at)}`,
          secondary: true,
        },
      ]}
    />
  );
}
