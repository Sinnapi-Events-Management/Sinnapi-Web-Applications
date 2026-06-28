import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'How Sinnapi began.',
  alternates: { canonical: '/story' },
};

export { default } from '@/containers/story';
