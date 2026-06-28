import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Sinnapi team.',
  alternates: { canonical: '/contact' },
};

export { default } from '@/containers/contact';
