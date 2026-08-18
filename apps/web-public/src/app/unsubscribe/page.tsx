import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email preferences',
  description: 'Manage or cancel your Sinnapi email subscriptions.',
  // Kept out of search results and out of the sitemap: the page is only
  // meaningful with a token, and an indexed unsubscribe URL is a page people
  // land on from Google unable to do the one thing it exists for.
  robots: { index: false, follow: false },
};

export { default } from '@/containers/emailPreferences';
