import { RecordCard, StatusChip, Typography, settlementMethodLabel } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { PayoutModel } from '@/lib/types';
import { PAYOUT_KIND_LABEL } from '../../schema/Columns';

/** One payment to the vendor on a phone: what it was for, how much, when, how. */
export default function PayoutCard({ payout: p }: { payout: PayoutModel }) {
  const paidOn = p.settled_at ?? p.completed_at;
  return (
    <RecordCard
      title={PAYOUT_KIND_LABEL[p.kind] ?? p.kind}
      amount={formatMoney(p.amount, p.currency)}
      meta={`${paidOn ? `Paid ${formatDate(paidOn)}` : formatDate(p.created_at)} · ${settlementMethodLabel(p.settlement_method)}`}
      chip={<StatusChip status={p.status} />}
      footer={
        p.blocked_reason && (
          <Typography variant="body2" color="warning.main" fontWeight={600}>
            Add your bank account in Settings so we can send this.
          </Typography>
        )
      }
    />
  );
}
