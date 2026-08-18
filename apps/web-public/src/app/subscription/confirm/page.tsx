import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confirm your subscription',
  description: 'Confirm your Sinnapi newsletter subscription.',
  // Meaningless without a token, so it stays out of search results.
  robots: { index: false, follow: false },
};

export { default } from '@/containers/subscriptionConfirm';
