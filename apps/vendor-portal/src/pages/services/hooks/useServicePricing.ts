import { useCallback, useMemo } from 'react';
import { isPackagePublished, packageFromPrice } from '@sinnapi/ui';
import { usePackages } from '@/hooks/queries';
import type { PackageModel } from '@/lib/types';

/** What a service's packages amount to, from the market's point of view. */
export type ServicePricing = {
  /** The cheapest tier a client could buy across this service's LIVE packages. */
  from: { amount: number; currency: string } | null;
  /** Packages linked to this service, drafts and archived ones included. */
  packageCount: number;
  /** How many of those a client can actually see right now. */
  publishedCount: number;
};

const NOTHING: ServicePricing = { from: null, packageCount: 0, publishedCount: 0 };

/**
 * A service's price, derived rather than typed.
 *
 * WHY THIS EXISTS AT ALL
 * `vendor_services.base_price` was a number the vendor typed into a field that
 * fed nothing — no client, no search RPC, no public page ever read it — while
 * the figure the market sees comes from the tiers of the packages hanging off
 * that service. So the vendor was maintaining a price that could disagree with
 * their real one, with no way to tell which a client was reading.
 *
 * This computes the honest answer instead, and it computes it through
 * `packageFromPrice` — the same function that produces the number on the
 * client's package card and on the marketing site. A second implementation
 * here, even a correct-looking one, would be the platform quoting two prices
 * for one offer, which is exactly the failure `packagePricing` was written to
 * prevent.
 *
 * PUBLISHED ONLY
 * `from` counts live packages, because that is what a client can buy. A draft
 * priced at half the published one is not a price the vendor is offering, and
 * a card that led with it would tell them their service is cheaper than the
 * market can see. Drafts are reported separately, as a count, where the vendor
 * can act on them.
 *
 * One query for the whole page: `usePackages` is already cached under
 * `['v-packages', vendorId]` for the packages screen, so opening Services
 * costs no extra round trip.
 */
export function useServicePricing(vendorId: string) {
  const { data, isLoading, error } = usePackages(vendorId);

  const byService = useMemo(() => {
    const map = new Map<string, ServicePricing>();

    for (const pkg of (data ?? []) as PackageModel[]) {
      const serviceId = pkg.vendor_service_id;
      // A package with no linked service prices nothing here. It is still a
      // real package on the vendor's profile — it just is not this catalogue
      // line's evidence of a price.
      if (!serviceId) continue;

      const current = map.get(serviceId) ?? { ...NOTHING };
      current.packageCount += 1;

      if (isPackagePublished(pkg)) {
        current.publishedCount += 1;
        const from = packageFromPrice(pkg);
        // Cheapest wins across every published package on the service, so
        // "From X" means the least a client could pay for this kind of work
        // — not the least within whichever package happened to be read first.
        if (from && (current.from === null || from.amount < current.from.amount)) {
          current.from = { amount: from.amount, currency: from.currency };
        }
      }

      map.set(serviceId, current);
    }

    return map;
  }, [data]);

  /**
   * Never null, so a card renders the "no packages yet" state rather than
   * nothing. Memoised on the map: an inline arrow would be a new identity on
   * every render and would defeat the `useMemo` in every caller that lists
   * services through it.
   */
  const pricingFor = useCallback(
    (serviceId: string): ServicePricing => byService.get(serviceId) ?? NOTHING,
    [byService],
  );

  return { isLoading, error, pricingFor };
}
