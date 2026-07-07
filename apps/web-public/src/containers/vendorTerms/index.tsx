import { vendorTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui/organisms';
import LegalHero from '@/components/organisms/legalHero';
import { vendorTermsHero } from './data/hero';

// Vendor terms page: an editorial hero owns the title + metadata, then the shared
// LegalContent renders the document body (header suppressed to avoid duplication).
export default function VendorTermsContainer() {
  return (
    <>
      <LegalHero document={vendorTerms} {...vendorTermsHero} />
      <LegalContent document={vendorTerms} hideHeader />
    </>
  );
}
