import { generalTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui';

// Terms page: renders the general terms of service legal document.
export default function TermsContainer() {
  return <LegalContent document={generalTerms} />;
}
