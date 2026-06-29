import PricingHero from './organisms/pricingHero';
import PricingPlans from './organisms/pricingPlans';
import PricingComparison from './organisms/pricingComparison';
import PricingTrust from './organisms/pricingTrust';
import PricingFaq from './organisms/pricingFaq';
import PricingCta from './organisms/pricingCta';

/**
 * Pricing page container. Composes the pricing organisms as a funnel:
 * hero → plans (with billing toggle) → detailed comparison → trust signals →
 * FAQs → closing CTA. Presentation lives in the organisms; this file only
 * sequences. Live prices remain admin-managed; the figures shown are indicative
 * list prices (see pricingPlans/data/plans.ts).
 */
export default function PricingContainer() {
  return (
    <>
      <PricingHero />
      <PricingPlans />
      <PricingComparison />
      <PricingTrust />
      <PricingFaq />
      <PricingCta />
    </>
  );
}
