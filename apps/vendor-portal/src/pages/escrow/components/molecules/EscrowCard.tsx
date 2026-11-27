import { RecordCard, Skeleton, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { EscrowBookingRel, EscrowModel } from '@/lib/types';
import { escrowLine } from '../../schema/escrowLine';

type Props = { escrow: EscrowModel; clientName: string | null; onOpen: () => void };

/** One booking's held money on a phone: who, how much, and when it comes. */
export default function EscrowCard({ escrow: e, clientName, onOpen }: Props) {
  const b = one<EscrowBookingRel>(e.bookings);
  return (
    <RecordCard
      title={clientName ?? <Skeleton width={120} />}
      amount={formatMoney(e.agreed_amount ?? e.net_payout_amount, e.currency)}
      meta={
        <>
          {b?.event_date ? `Event ${formatDate(b.event_date)} · ` : ''}
          {escrowLine(e)}
        </>
      }
      chip={<StatusChip status={e.status} domain="vendorEscrow" />}
      onClick={b?.id ? onOpen : undefined}
    />
  );
}
