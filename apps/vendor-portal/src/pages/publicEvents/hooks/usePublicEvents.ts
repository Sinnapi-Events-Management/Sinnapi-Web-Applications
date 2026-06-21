import { usePublicEvents as usePublicEventsQuery, useMyInterests } from '@/hooks/queries';

export function usePublicEvents(vendorId: string) {
  const events = usePublicEventsQuery();
  const interests = useMyInterests(vendorId);
  const interestedIds = new Set((interests.data ?? []).map((i) => i.event_id));
  const rows = events.data ?? [];

  return { events, interestedIds, rows };
}
