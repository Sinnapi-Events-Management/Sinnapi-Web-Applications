/**
 * The subscription page's three sections, mirrored into the URL
 * (`/subscriptions/:id?tab=payments`).
 *
 * Split by the question Finance is answering: "where does this vendor
 * stand" (overview), "who paid what and when" (payments), and "what happened
 * to it, in order" (timeline). Overview is the default and is represented by
 * the *absence* of the parameter, so `/subscriptions/:id` stays canonical.
 */
export const SUBSCRIPTION_TABS = ['overview', 'payments', 'timeline'] as const;

export type SubscriptionTab = (typeof SUBSCRIPTION_TABS)[number];

/** `subscription_events.event_type` as a person reads it. */
const EVENT_LABEL: Record<string, string> = {
  created: 'Created',
  trial_started: 'Trial started',
  payment_pending: 'Checkout opened',
  activated: 'Activated',
  renewed: 'Renewed',
  reactivated: 'Reactivated',
  payment_failed: 'Payment failed',
  renewal_reminder_sent: 'Renewal reminder sent',
  grace_entered: 'Entered grace',
  suspended: 'Suspended',
  expired: 'Expired',
  hide_blocked: 'Hide withheld for review',
  cancelled: 'Cancelled',
};

export function eventLabel(eventType: string): string {
  return EVENT_LABEL[eventType] ?? eventType.replace(/_/g, ' ');
}
