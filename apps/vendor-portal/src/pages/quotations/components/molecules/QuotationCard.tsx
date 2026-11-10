import { Skeleton, RecordCard, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { VendorQuotationModel } from '@/lib/types';
import QuotationBookingCell from './QuotationBookingCell';

type Props = {
  quotation: VendorQuotationModel;
  /** `null` while the name is loading. */
  clientName: string | null;
  booking: Parameters<typeof QuotationBookingCell>[0]['booking'];
  onOpen: () => void;
};

/** One quote on a phone. An unpriced request reads "Not priced yet", not a dash. */
export default function QuotationCard({ quotation: q, clientName, booking, onOpen }: Props) {
  return (
    <RecordCard
      title={clientName ?? <Skeleton width={120} />}
      amount={q.total ? formatMoney(q.total, q.currency) : 'Not priced yet'}
      meta={[
        q.event_on && `Event ${formatDate(q.event_on)}`,
        q.valid_until ? `Valid until ${formatDate(q.valid_until)}` : 'No expiry set',
        q.reference_no ?? '—',
      ]
        .filter(Boolean)
        .join(' · ')}
      chip={<StatusChip status={q.status} />}
      // Only when a booking exists: the cell's "—" placeholder is table filler.
      footer={booking && <QuotationBookingCell status={q.status} booking={booking} />}
      onClick={onOpen}
    />
  );
}
