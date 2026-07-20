import type { StatusTabOption } from '@/components/ui/StatusTabs';
import { ALL_STATUSES, type StatusFilterValue } from '@/hooks/useStatusFilter';
import type { NotificationTemplateStats } from '@/hooks/queries';

/**
 * The delivery channels a template can target. Mirrors the `notification_channel`
 * Postgres enum, so filtering on these values is always valid server-side.
 */
export const NOTIFICATION_CHANNELS = ['email', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** `all` (the unfiltered tab) plus the concrete channels. */
export type ChannelTabValue = StatusFilterValue<NotificationChannel>;

/** Human labels for the raw enum values used across chips, tabs, and tiles. */
export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  in_app: 'In-app',
};

/** Narrowing guard so presentational components can accept the raw `string`. */
export function isNotificationChannel(value: string): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

/** Merge live counts into the channel tab defs for <StatusTabs />. */
export function buildChannelTabs(
  stats?: NotificationTemplateStats,
): StatusTabOption<ChannelTabValue>[] {
  return [
    { value: ALL_STATUSES, label: 'All', count: stats?.all },
    { value: 'email', label: CHANNEL_LABELS.email, count: stats?.email },
    { value: 'in_app', label: CHANNEL_LABELS.in_app, count: stats?.in_app },
  ];
}

/** Empty-state copy: distinguish "nothing seeded" from "nothing matched". */
export function getEmptyMessage(filtered: boolean): string {
  return filtered
    ? 'No templates match your filters. Try a different channel or search term.'
    : 'No templates yet. Seed templates per trigger key (email + in-app).';
}
