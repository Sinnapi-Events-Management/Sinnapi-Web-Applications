import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Escrow Policy',
  alternates: { canonical: '/escrow-policy' },
};

export { default } from '@/containers/escrowPolicy';
