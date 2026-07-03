import { privacyPolicy } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui/organisms';

// Privacy page: renders the privacy policy legal document.
export default function PrivacyContainer() {
  return <LegalContent document={privacyPolicy} />;
}
