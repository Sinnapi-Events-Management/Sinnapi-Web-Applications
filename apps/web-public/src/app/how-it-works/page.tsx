import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Discover vendors, request quotes, book securely with escrow, and manage your event — all on Sinnapi.',
  alternates: { canonical: '/how-it-works' },
};

export { default } from '@/containers/howItWorks';
