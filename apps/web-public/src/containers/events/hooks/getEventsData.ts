import { getEvents } from '@/lib/queries';

export async function getEventsData() {
  const events = await getEvents();
  return { events };
}
