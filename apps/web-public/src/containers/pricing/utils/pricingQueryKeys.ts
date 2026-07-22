/**
 * Query keys for the pricing page.
 *
 * Shared verbatim between the server prefetch and the client hooks — hydration
 * only works if both sides address the identical key, so building a key in two
 * places is how a page silently refetches what it just server-rendered. Hence
 * one factory, imported by both.
 *
 * `plans` is deliberately addressed by two different sections: the cards and
 * the comparison table's column headers are the same catalogue, so they share
 * one cache entry and one request.
 */
export const pricingKeys = {
  /** Root — `invalidateQueries({ queryKey: pricingKeys.all })` clears everything below. */
  all: ['pricing'] as const,

  /** The plan catalogue: one entry per tier, both billing cycles resolved. */
  plans: () => [...pricingKeys.all, 'plans'] as const,

  /** Structured capability flags behind the comparison matrix. */
  features: () => [...pricingKeys.all, 'features'] as const,
};
