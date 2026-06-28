import type { Metadata } from 'next';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Sinnapi vendor subscription plans — Starter, Professional, and Elite.',
  alternates: { canonical: '/pricing' },
};

export { default } from '@/containers/pricing';
