import { getEventById } from '@/lib/queries';

export async function getEventDetailData(id: string) {
  const event = await getEventById(id);
  return { event };
}
