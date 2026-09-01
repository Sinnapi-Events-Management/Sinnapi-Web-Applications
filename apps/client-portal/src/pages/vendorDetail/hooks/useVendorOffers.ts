import { useMemo } from 'react';
import { useVendorOffers as useVendorOffersQuery } from '@/hooks/queries';

/**
 * Every saving this vendor is running, read once for the whole profile.
 *
 * TWO PLACES, ONE READ
 * The strip above the tabs and the offers section inside them are the same
 * facts at two depths — a teaser a visitor cannot miss, and the full terms for
 * the one who wants them. Both call this, and React Query serves the second
 * from the first's cache, so the page makes one request and, more importantly,
 * cannot show two different sets of offers on one screen.
 *
 * DISTINCT FROM `useVendorPackages`' OFFER READ
 * That one is `vendor_package_offers` — one row per package per offer, used to
 * price a specific tier. This is `vendor_offers` — one row per offer with the
 * packages it covers named on it. A card that says "20% off, covers Gold and
 * Platinum" cannot be built from the first without regrouping thirty rows, and
 * a tier price cannot be built from this one at all. They answer different
 * questions and the server answers each in one round trip.
 *
 * The rows arrive ordered by `ends_at`, so what is about to disappear leads.
 * That order is kept rather than re-sorted: urgency is the only ranking a
 * client can act on, and the RPC already applied it.
 */
export function useVendorOffers(vendorId?: string) {
  const { data, isLoading, error } = useVendorOffersQuery(vendorId);

  const offers = useMemo(() => data ?? [], [data]);

  return {
    offers,
    /**
     * Whether the profile has anything to say about savings at all.
     *
     * Both surfaces branch on this rather than on `offers.length` mid-render,
     * and the strip renders nothing when it is false: a profile is not
     * incomplete for having no sale on, and an empty "Current offers" heading
     * implies one is missing.
     */
    hasOffers: offers.length > 0,
    count: offers.length,
    isLoading,
    error,
  };
}
