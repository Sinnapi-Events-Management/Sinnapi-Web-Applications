import type { Metadata } from 'next';

/**
 * Ten minutes rather than the vendor directory's fifteen.
 *
 * An offer has a deadline on it, and this page prints how long is left. A
 * campaign that ended forty minutes ago and is still on a cached page is a
 * price claim the platform cannot honour — which is a different class of stale
 * from a vendor's biography being an hour old.
 */
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Event vendor offers & discounts',
  description:
    'Live discounts and promotions from verified event vendors on Sinnapi — photographers, caterers, venues, decorators and more. Every offer has a deadline and a real package behind it.',
  alternates: { canonical: '/offers' },
  openGraph: {
    title: 'Live offers from verified event vendors',
    description:
      'Real savings on real packages, with the deadline on every card. Browse offers by category on Sinnapi.',
  },
};

export { default } from '@/containers/offers';
