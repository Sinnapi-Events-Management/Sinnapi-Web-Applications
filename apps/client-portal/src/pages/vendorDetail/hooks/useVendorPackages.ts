import { useCallback, useMemo, useState } from 'react';
import { defaultPackageTier, packageTiers } from '@sinnapi/ui';
import { groupOffersByPackage, offersForTier, type OfferModel } from '@sinnapi/ui/offers';
import {
  useVendorPackages as useVendorPackagesQuery,
  useVendorPackageOffers,
} from '@/hooks/queries';
import type { PackageModel } from '@/lib/types';

/**
 * The package, tier and offer a client has decided to ask about.
 *
 * The offer travels with the request because `request_quotation` takes a code:
 * a client who clicked "Request this package" while a saving was on the card
 * has already chosen the offer, and making them re-type the code into the brief
 * is asking them to claim something they were just shown.
 */
export type PackageRequest = {
  pkg: PackageModel;
  tierId: string;
  tierName: string;
  offer: OfferModel | null;
};

/**
 * A vendor's published packages, and the request a client starts from one.
 *
 * The tier a client is looking at is held here rather than inside each
 * showcase, because it is what the request carries: "I want the Gold package"
 * is the whole content of the message, and a tier that only the presentation
 * layer knew about could not travel with it.
 *
 * Keyed by package id so two showcases on one page each keep their own tier —
 * a client comparing Photography against Videography is making two independent
 * choices.
 */
export function useVendorPackages(vendorId?: string) {
  const { data, isLoading, error } = useVendorPackagesQuery(vendorId);
  // Secondary to the packages in every sense. A profile whose offers read fails
  // shows correct list prices, which is a worse page but not a wrong one — so
  // this never gates and its error is never surfaced.
  const offers = useVendorPackageOffers(vendorId);
  const [tierByPackage, setTierByPackage] = useState<Record<string, string>>({});
  const [request, setRequest] = useState<PackageRequest | null>(null);

  // Packages with no priced tier are filtered out rather than rendered empty.
  // The database refuses to publish one, but a package can lose its tiers to a
  // later edit, and a card offering nothing is worse than one fewer card.
  const packages = useMemo(
    () => (data ?? []).filter((pkg) => packageTiers(pkg).length > 0),
    [data],
  );

  // Indexed once per fetch. Doing it per card would walk the whole row set on
  // every tier switch, which is the interaction this data exists for.
  const offersByPackage = useMemo(() => groupOffersByPackage(offers.data), [offers.data]);

  /**
   * The offers that apply to one package, at the tier on screen.
   *
   * `PackageShowcase` picks the best of them and prices it; this only has to
   * narrow the batch read to the card asking. Passing the package-level set
   * (tier null) would put a Gold-only saving on the Silver tab.
   */
  const offersFor = useCallback(
    (pkg: PackageModel, tierId: string | null) =>
      offersForTier(offersByPackage.get(pkg.id), tierId),
    [offersByPackage],
  );

  const selectTier = useCallback((packageId: string, tierId: string) => {
    setTierByPackage((current) => ({ ...current, [packageId]: tierId }));
  }, []);

  const selectedTierId = useCallback(
    (pkg: PackageModel) => tierByPackage[pkg.id] ?? defaultPackageTier(pkg)?.id ?? null,
    [tierByPackage],
  );

  const openRequest = useCallback(
    (pkg: PackageModel, tierId: string, tierName: string, offer: OfferModel | null) => {
      setRequest({ pkg, tierId, tierName, offer });
    },
    [],
  );

  return {
    packages,
    isLoading,
    error,
    hasPackages: packages.length > 0,
    selectedTierId,
    selectTier,
    offersFor,
    request,
    openRequest,
    closeRequest: () => setRequest(null),
  };
}
