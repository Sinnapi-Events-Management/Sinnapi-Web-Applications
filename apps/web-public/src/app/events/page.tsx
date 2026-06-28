import type { Metadata } from 'next';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Events & inspiration',
  description: 'Explore real events and inspiration, and discover open events looking for vendors.',
  alternates: { canonical: '/events' },
};

export { default } from '@/containers/events';
