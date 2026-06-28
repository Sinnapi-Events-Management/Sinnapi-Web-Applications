import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become a vendor',
  description:
    'Apply to list your event business on Sinnapi — verified vendors reach more clients with secure bookings and escrow.',
  alternates: { canonical: '/apply' },
};

export { default } from '@/containers/apply';
