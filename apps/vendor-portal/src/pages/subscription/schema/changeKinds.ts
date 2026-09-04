import type { MySubscriptionModel, SubscriptionQuoteModel } from '@/lib/types';

type ChangeKind = SubscriptionQuoteModel['change_kind'];

/** Subscription states from which a payment reinstates a listing. */
export const LAPSED_STATUSES: ReadonlySet<string> = new Set([
  'grace',
  'past_due',
  'expired',
  'suspended',
  'cancelled',
]);

/**
 * What the plan card's button says, given where the vendor stands.
 *
 * The button never says "Current plan" and disables itself: a vendor on the
 * plan they are looking at is exactly the one who needs to renew it. It says
 * what paying now would do instead.
 */
export function planActionLabel(planId: string, subscription: MySubscriptionModel | null): string {
  if (!subscription || LAPSED_STATUSES.has(subscription.status)) return 'Pay and activate';
  if (subscription.status === 'trialing') return 'Choose plan';
  if (subscription.plan_id === planId) return 'Renew';
  return 'Switch to this plan';
}

/**
 * The confirmation's one-sentence account of what the payment does to the
 * current period — the thing a vendor must not discover afterwards.
 */
export function describeChange(quote: SubscriptionQuoteModel, formatDate: (v: string) => string) {
  const from = formatDate(quote.period_start);
  const to = formatDate(quote.period_end);
  const kind: ChangeKind = quote.change_kind;

  switch (kind) {
    case 'renewal':
      return `Paying now extends your ${quote.plan_name} plan. The new period runs from ${from} to ${to}; nothing from the current period is lost.`;
    case 'trial_conversion':
      return `Your paid period starts when the trial ends, on ${from}, and runs to ${to}. You keep every remaining trial day.`;
    case 'upgrade':
    case 'downgrade': {
      const current = quote.current_plan_name ?? 'current';
      const forfeit =
        quote.unused_days > 0
          ? ` The ${quote.unused_days} unused day${quote.unused_days === 1 ? '' : 's'} left on your ${current} plan are not credited.`
          : '';
      return `The ${quote.plan_name} plan starts today and runs to ${to}, charged in full.${forfeit}`;
    }
    case 'reactivation':
      return `Your listing comes back the moment the payment clears. The period runs from today to ${to}.`;
    case 'new':
    default:
      return `The period runs from ${from} to ${to}.`;
  }
}

/** Short heading for the confirmation dialog. */
export function changeTitle(quote: SubscriptionQuoteModel): string {
  switch (quote.change_kind) {
    case 'renewal':
      return `Renew ${quote.plan_name}`;
    case 'upgrade':
      return `Upgrade to ${quote.plan_name}`;
    case 'downgrade':
      return `Switch to ${quote.plan_name}`;
    case 'reactivation':
      return `Reactivate on ${quote.plan_name}`;
    default:
      return `Start ${quote.plan_name}`;
  }
}
