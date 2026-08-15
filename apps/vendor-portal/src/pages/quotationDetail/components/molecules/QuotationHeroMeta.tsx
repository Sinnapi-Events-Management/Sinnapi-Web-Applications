import { HeroMetaStrip } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CelebrationIcon from '@mui/icons-material/Celebration';
import SendIcon from '@mui/icons-material/Send';
import { formatDate, formatMoney } from '@/lib/config';
import type { EventRefModel, QuotationDetailModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  event: EventRefModel | null;
  isPriced: boolean;
};

/**
 * The facts a vendor checks before deciding anything: what they quoted, how
 * long it holds, which event it is for and when it went out.
 *
 * The total is omitted entirely on an unbuilt quote rather than shown as a
 * zero — a request with no price yet must never read "UGX 0" in the largest
 * text on the page.
 */
export default function QuotationHeroMeta({ quotation: q, event, isPriced }: Props) {
  return (
    <HeroMetaStrip
      facts={[
        isPriced && { icon: <PaymentsIcon />, text: formatMoney(q.total, q.currency) },
        q.valid_until && {
          icon: <EventAvailableIcon />,
          text: `Valid until ${formatDate(q.valid_until)}`,
        },
        event?.title && { icon: <CelebrationIcon />, text: event.title },
        q.sent_at && { icon: <SendIcon />, text: `Sent ${formatDate(q.sent_at)}` },
      ]}
    />
  );
}
