import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about using Sinnapi.',
  alternates: { canonical: '/faq' },
};

export { default } from '@/containers/faq';
