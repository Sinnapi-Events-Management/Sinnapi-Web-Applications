import type { MarketingSubscriptionCounts } from '@/hooks/queries';

/** The `marketing_consent_status` enum, in lifecycle order. */
export const CONSENT_STATUSES = ['pending', 'subscribed', 'unsubscribed'] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export type SubscriberTab = 'subscriptions' | 'suppressions';

/** Where a subscription came from — the Art.7(1) provenance, in plain words. */
export const CONSENT_SOURCE_LABELS: Record<string, string> = {
  client_signup: 'Client sign-up',
  vendor_application: 'Vendor application',
  preference_centre: 'Preference centre',
  admin_import: 'Admin import',
  admin_manual: 'Added by admin',
};

/** Why an address can no longer be mailed. */
export const SUPPRESSION_REASON_LABELS: Record<string, string> = {
  unsubscribed: 'Unsubscribed',
  bounced: 'Hard bounce',
  complained: 'Spam complaint',
  manual: 'Added by admin',
};

export function buildSubscriberTabs(counts?: MarketingSubscriptionCounts) {
  return [
    { value: 'subscriptions' as const, label: 'Subscriptions', count: counts?.all },
    { value: 'suppressions' as const, label: 'Suppressed', count: counts?.suppressed },
  ];
}
