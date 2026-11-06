import { Skeleton, PaymentWindowChip, RecordCard, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { VendorBookingModel } from '@/lib/types';

type Props = {
  booking: VendorBookingModel;
  /** `null` while the name is loading. */
  clientName: string | null;
  onOpen: () => void;
};

/** One booking on a phone: who, how much, when, and where it stands. */
export default function BookingCard({ booking: b, clientName, onOpen }: Props) {
  return (
    <RecordCard
      title={clientName ?? <Skeleton width={120} />}
      amount={formatMoney(b.amount, b.currency)}
      meta={`${formatDate(b.event_date)} · ${b.reference_no ?? '—'}`}
      chip={<StatusChip status={b.status} />}
      footer={<PaymentWindowChip booking={b} audience="vendor" />}
      onClick={onOpen}
    />
  );
}
