import ApplyHero from './organisms/applyHero';
import VendorBenefits from './organisms/vendorBenefits';
import OnboardingTimeline from './organisms/onboardingTimeline';
import VendorFaq from './organisms/vendorFaq';
import ApplyCta from './organisms/applyCta';

/**
 * Apply page container. Composes the vendor-onboarding organisms into a
 * conversion funnel: pitch the opportunity → prove the value → show the path →
 * answer objections → close. Presentation lives in the organisms; this file
 * only sequences them.
 */
export default function ApplyContainer() {
  return (
    <>
      <ApplyHero />
      <VendorBenefits />
      <OnboardingTimeline />
      <VendorFaq />
      <ApplyCta />
    </>
  );
}
