import type { StatusTabOption } from '@sinnapi/ui';
import type { NewsletterAudience, MarketingTopic } from '@/lib/types';
import type { NewsletterCampaignCounts } from '@/hooks/queries';

/**
 * The `newsletter_status` enum in lifecycle order. Authoritative source for the
 * campaign list's tabs and their counts.
 *
 * `cancelled` and `failed` are deliberately absent from the tab set below:
 * both are rare, neither is a queue anybody works through, and a tab that reads
 * zero on almost every visit is a tab that trains people to ignore the row.
 * They are still reachable — the All tab shows them, with their own chip.
 */
export const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'cancelled',
  'failed',
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Statuses a campaign can still be edited from. Everything else is history. */
export const EDITABLE_STATUSES: readonly string[] = ['draft'];

export const NEWSLETTER_AUDIENCES = ['clients', 'vendors'] as const;

export const AUDIENCE_META: Record<
  NewsletterAudience,
  { label: string; topic: MarketingTopic; description: string }
> = {
  clients: {
    label: 'Clients',
    topic: 'client_updates',
    description: 'People planning events — clients and event planners.',
  },
  vendors: {
    label: 'Vendors',
    topic: 'vendor_updates',
    description: 'Service providers listed on Sinnapi.',
  },
};

export const TOPIC_META: Record<MarketingTopic, { label: string; description: string }> = {
  client_updates: {
    label: 'Client updates',
    description: 'Planning tips, featured vendors and occasional offers.',
  },
  vendor_updates: {
    label: 'Vendor updates',
    description: 'Business tips, platform news and opportunities.',
  },
};

export type CampaignTabValue = 'all' | 'draft' | 'scheduled' | 'sending' | 'sent';

export function buildCampaignTabs(
  counts?: NewsletterCampaignCounts,
): StatusTabOption<CampaignTabValue>[] {
  return [
    { value: 'all', label: 'All', count: counts?.all },
    { value: 'draft', label: 'Drafts', count: counts?.draft },
    { value: 'scheduled', label: 'Scheduled', count: counts?.scheduled },
    { value: 'sending', label: 'Sending', count: counts?.sending },
    { value: 'sent', label: 'Sent', count: counts?.sent },
  ];
}

export function getEmptyMessage(filtered: boolean): string {
  return filtered
    ? 'No campaigns match these filters.'
    : 'No campaigns yet. Create one to send your first newsletter.';
}
