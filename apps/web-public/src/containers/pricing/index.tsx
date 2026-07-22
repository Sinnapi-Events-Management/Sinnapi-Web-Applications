import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import PricingHero from './organisms/pricingHero';
import PricingPlans from './organisms/pricingPlans';
import PricingComparison from './organisms/pricingComparison';
import PricingTrust from './organisms/pricingTrust';
import PricingFaq from './organisms/pricingFaq';
import PricingCta from './organisms/pricingCta';
import { prefetchPricingData } from './utils/prefetchPricingData';

/**
 * Pricing page container. Composes the pricing organisms as a funnel:
 * hero → plans (with billing toggle) → detailed comparison → trust signals →
 * FAQs → closing CTA. Presentation lives in the organisms; this file only
 * sequences and resolves the data.
 *
 * Prices are admin-managed and read live from `pricing_plans` — the page no
 * longer carries a hard-coded catalogue, so an edit in the admin portal is the
 * only place a price changes. The server resolves the catalogue and dehydrates
 * it here so the figures are in the HTML on first paint; the two sections below
 * consume it from the client cache, which is what lets the billing toggle
 * switch monthly⇄annual without a request.
 *
 * The boundary wraps both data-driven sections rather than each one separately:
 * they read the same catalogue under the same key, so one dehydrated payload
 * serves both and the columns of the comparison table can never disagree with
 * the cards above them.
 */
export default async function PricingContainer() {
  const queryClient = await prefetchPricingData();

  return (
    <>
      <PricingHero />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PricingPlans />
        <PricingComparison />
      </HydrationBoundary>
      <PricingTrust />
      <PricingFaq />
      <PricingCta />
    </>
  );
}
