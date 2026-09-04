/** What each exception kind actually means, in a Finance admin's terms. */
export const KIND_LABEL: Record<string, string> = {
  stuck_payment: 'Stuck payment',
  unbalanced_escrow: 'Ledger out of balance',
  psp_amount_mismatch: 'Amount mismatch',
  psp_fee_variance: 'Fee variance',
  orphan_payment: 'Orphan payment',
  missing_payout: 'Missing payout',
  overdue_settlement: 'Settlement overdue',
  webhook_replay: 'Webhook replay',
};
