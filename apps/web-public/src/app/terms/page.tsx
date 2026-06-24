import type { Metadata } from 'next';
import { generalTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui';

export const metadata: Metadata = {
  title: 'Terms of Service',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalContent document={generalTerms} />;
}
