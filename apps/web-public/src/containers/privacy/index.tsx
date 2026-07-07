import { privacyPolicy } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui/organisms';
import LegalHero from '@/components/organisms/legalHero';
import { privacyHero } from './data/hero';

// Privacy page: editorial hero owns the title + metadata, then the shared
// LegalContent renders the document body (header suppressed to avoid duplication).
export default function PrivacyContainer() {
  return (
    <>
      <LegalHero document={privacyPolicy} {...privacyHero} />
      <LegalContent document={privacyPolicy} hideHeader />
    </>
  );
}
