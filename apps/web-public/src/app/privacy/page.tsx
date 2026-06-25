import type { Metadata } from 'next';
import { privacyPolicy } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return <LegalContent document={privacyPolicy} />;
}
