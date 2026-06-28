import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Sinnapi is a trusted marketplace connecting clients with verified event service providers across Uganda and beyond.',
  alternates: { canonical: '/about' },
};

export { default } from '@/containers/about';
