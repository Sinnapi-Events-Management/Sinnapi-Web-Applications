import type { Metadata } from 'next';

export const revalidate = 900; // ISR

export const metadata: Metadata = {
  title: 'Find verified event vendors',
  description:
    'Browse and compare trusted, verified event service providers — photographers, caterers, venues, decorators and more.',
  alternates: { canonical: '/vendors' },
};

export { default } from '@/containers/vendors';
