import { generalTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui/organisms';
import LegalHero from '@/components/organisms/legalHero';
import { termsHero } from './data/hero';

// General terms page: editorial hero owns the title + metadata, then the shared
// LegalContent renders the document body (header suppressed to avoid duplication).
export default function TermsContainer() {
  return (
    <>
      <LegalHero document={generalTerms} {...termsHero} />
      <LegalContent document={generalTerms} hideHeader />
    </>
  );
}
