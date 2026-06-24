import type { Metadata } from 'next';
import { vendorTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui';

export const metadata: Metadata = {
  title: 'Vendor Terms',
  alternates: { canonical: '/vendor-terms' },
};

export default function VendorTermsPage() {
  return <LegalContent document={vendorTerms} />;
}
