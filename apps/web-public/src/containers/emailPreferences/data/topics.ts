/**
 * The topics the preference centre can manage.
 *
 * MUST stay in step with the `marketing_topic` enum. Kept as data here rather
 * than imported from anywhere because the public site has no generated database
 * types and this is the one place a visitor reads these names in plain English.
 */
export const TOPICS = [
  {
    key: 'client_updates',
    label: 'Updates for planning events',
    description:
      'Planning tips, vendors worth knowing about, and occasional offers. Around twice a month.',
  },
  {
    key: 'vendor_updates',
    label: 'Updates for vendors',
    description:
      'Business tips, platform news and seasonal demand for vendors listed on Sinnapi. Around twice a month.',
  },
] as const;

export type TopicKey = (typeof TOPICS)[number]['key'];

export function topicLabel(key: string): string {
  return TOPICS.find((t) => t.key === key)?.label ?? key;
}
