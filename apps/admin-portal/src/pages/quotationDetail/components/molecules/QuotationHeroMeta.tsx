import { HeroMetaSection, type QuotationPricing } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CelebrationIcon from '@mui/icons-material/Celebration';
import SendIcon from '@mui/icons-material/Send';
import { formatDate, formatMoney } from '@/lib/config';
import type { AdminQuotationDetailModel } from '@/lib/types';

type Props = {
  quotation: AdminQuotationDetailModel;
  pricing: QuotationPricing;
};

/**
 * The facts an operator checks before reading anything else: what was quoted,
 * how long it held, which event it was for and when it went out.
 *
 * The total is omitted entirely on a request that was never priced rather than
 * shown as a zero — a quote with no price on it must never read "UGX 0" in the
 * largest text on the page, least of all on the screen used to settle arguments
 * about what was offered.
 *
 * Only the money survives on a phone; the rest are marked `secondary` and drop
 * below `md`, where they are all labelled rows on the Overview tab one tap
 * away. On an unpriced request nothing primary is left, and `HeroMetaSection`
 * then drops the whole strip and its divider rather than ruling a line under an
 * empty row.
 */
export default function QuotationHeroMeta({ quotation: q, pricing }: Props) {
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
        q.event?.title && { icon: <CelebrationIcon />, text: q.event.title, secondary: true },
        q.sent_at && {
          icon: <SendIcon />,
          text: `Sent ${formatDate(q.sent_at)}`,
          secondary: true,
        },
      ]}
    />
  );
}
