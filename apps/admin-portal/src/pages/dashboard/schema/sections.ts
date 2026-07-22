/**
 * The dashboard's vertical sections, in reading order. Each is gated on the
 * permission that guards the page it summarises, so a finance-only admin lands
 * on the money band and a support admin on trust & safety — with the grid
 * reflowing rather than leaving holes where a section would have been.
 *
 * `perm` is a *client-side* affordance only: the RPC independently gates the
 * same data server-side, so hiding a section never doubles as the access check.
 */
export type SectionKey = 'queues' | 'subscriptions' | 'finance' | 'growth' | 'activity';

export type SectionDef = {
  key: SectionKey;
  /** Any one of these permissions is enough to show the section. */
  anyOf: string[];
};

export const SECTIONS: SectionDef[] = [
  {
    key: 'queues',
    anyOf: [
      'subscriptions.manage',
      'vendor.review',
      'payout.approve',
      'escrow.read',
      'refund.approve',
      'dispute.manage',
    ],
  },
  // Subscriptions lead the analytics: recurring plan revenue is the platform's
  // primary income, so it sits above the transactional (commission) band.
  { key: 'subscriptions', anyOf: ['subscriptions.manage'] },
  { key: 'finance', anyOf: ['finance.read'] },
  { key: 'growth', anyOf: ['vendor.manage', 'bookings.read'] },
  { key: 'activity', anyOf: ['audit.read'] },
];
