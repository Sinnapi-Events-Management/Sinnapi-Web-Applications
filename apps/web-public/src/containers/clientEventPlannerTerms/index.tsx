import { clientTerms } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui/organisms';

// Client & event planner terms page: renders the client terms legal document.
export default function ClientEventPlannerTermsContainer() {
  return <LegalContent document={clientTerms} />;
}
