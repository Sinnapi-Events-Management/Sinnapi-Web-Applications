import { listPricingPlans, listPlanFeatures } from '@/lib/queries';
import { getQueryClient } from '@/lib/queryClient';
import { pricingKeys } from './pricingQueryKeys';

/**
 * Warms the server's QueryClient with the whole pricing catalogue.
 *
 * This is what keeps a client-fetched pricing page indexable: the same
 * functions the browser would call are called here first, dehydrated into the
 * RSC payload, and adopted on mount — so prices ship inside the HTML with no
 * loading flash, and a crawler sees real figures rather than a skeleton. From
 * there the sections are ordinary TanStack Query consumers, which is what makes
 * the retry button work without a page reload.
 *
 * Both reads are independent, so they run concurrently: one round trip, not two.
 *
 * Deliberately *not* awaited through `Promise.all` on a rejection path — a
 * prefetch that throws would take the whole route down, and the pricing cards
 * failing is not a reason to lose the hero, FAQs and CTA. `prefetchQuery`
 * swallows the rejection by design (unlike `fetchQuery`), leaving the key
 * unpopulated so the client retries it and renders its own error state.
 */
export async function prefetchPricingData() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: pricingKeys.plans(),
      queryFn: () => listPricingPlans(),
    }),
    queryClient.prefetchQuery({
      queryKey: pricingKeys.features(),
      queryFn: () => listPlanFeatures(),
    }),
  ]);

  return queryClient;
}
