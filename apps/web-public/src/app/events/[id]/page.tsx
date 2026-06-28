import type { Metadata } from 'next';
import { getEventDetailData } from '@/containers/eventDetail/hooks/getEventDetailData';

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { event } = await getEventDetailData(params.id);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.title,
    description: event.description?.slice(0, 155) ?? `${event.title} on Sinnapi.`,
    alternates: { canonical: `/events/${event.id}` },
  };
}

export { default } from '@/containers/eventDetail';
