import { clientTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui/organisms';
import LegalHero from '@/components/organisms/legalHero';
import { clientEventPlannerTermsHero } from './data/hero';

// Client & event planner terms page: editorial hero owns the title + metadata,
// then the shared LegalContent renders the document body (header suppressed).
export default function ClientEventPlannerTermsContainer() {
  return (
    <>
      <LegalHero document={clientTerms} {...clientEventPlannerTermsHero} />
      <LegalContent document={clientTerms} hideHeader />
    </>
  );
}
