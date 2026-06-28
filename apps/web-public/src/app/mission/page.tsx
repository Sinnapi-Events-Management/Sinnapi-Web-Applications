import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission',
  description: "Sinnapi's mission.",
  alternates: { canonical: '/mission' },
};

export { default } from '@/containers/mission';
