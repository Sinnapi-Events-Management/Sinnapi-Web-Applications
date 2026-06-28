import { vendorTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui';

// Vendor terms page: renders the vendor terms legal document.
export default function VendorTermsContainer() {
  return <LegalContent document={vendorTerms} />;
}
