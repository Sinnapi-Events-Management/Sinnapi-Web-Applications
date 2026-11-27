import { formatDate, formatMoney } from '@/lib/config';
import type { EscrowModel } from '@/lib/types';

/**
 * One plain sentence on where this money is and when it reaches the vendor.
 * Replaces "Advance UGX 400,000 due 5 S…" cut off on a phone.
 */
export function escrowLine(e: EscrowModel): string {
  const adv = formatMoney(e.advance_amount, e.currency);
  switch (e.status) {
    case 'awaiting_advance':
      return e.advance_release_due_at
        ? `Advance ${adv} on ${formatDate(e.advance_release_due_at)}`
        : `Advance ${adv} coming`;
    case 'advance_released':
      return `Advance sent ${formatDate(e.advance_released_at)}. The rest comes after the job.`;
    case 'held':
    case 'funded':
      return 'Held safely. Paid to you after the job is done.';
    case 'release_requested':
    case 'payout_approved':
      return 'The client approved — the money is being sent to you.';
    case 'paid_out':
      return 'Paid to you in full.';
    case 'admin_review':
    case 'disputed':
      return 'Sinnapi is checking an issue on this booking.';
    case 'refunded':
    case 'partially_refunded':
      return 'Money was returned to the client.';
    default:
      return 'Waiting for the client to pay.';
  }
}
