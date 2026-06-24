import type { Metadata } from 'next';
import { clientTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui';

export const metadata: Metadata = {
  title: 'Client & Event Planner Terms',
  alternates: { canonical: '/client-event-planner-terms' },
};

export default function ClientTermsPage() {
  return <LegalContent document={clientTerms} />;
}
