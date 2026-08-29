import { useCallback, useMemo, useState } from 'react';
import { defaultPackageTier, packageTiers } from '@sinnapi/ui';
import { useVendorPackages as useVendorPackagesQuery } from '@/hooks/queries';
import type { PackageModel } from '@/lib/types';

/** The package and tier a client has decided to ask about. */
export type PackageRequest = { pkg: PackageModel; tierId: string; tierName: string };

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
  const [tierByPackage, setTierByPackage] = useState<Record<string, string>>({});
  const [request, setRequest] = useState<PackageRequest | null>(null);

  // Packages with no priced tier are filtered out rather than rendered empty.
  // The database refuses to publish one, but a package can lose its tiers to a
  // later edit, and a card offering nothing is worse than one fewer card.
  const packages = useMemo(
    () => (data ?? []).filter((pkg) => packageTiers(pkg).length > 0),
    [data],
  );

  const selectTier = useCallback((packageId: string, tierId: string) => {
    setTierByPackage((current) => ({ ...current, [packageId]: tierId }));
  }, []);

  const selectedTierId = useCallback(
    (pkg: PackageModel) => tierByPackage[pkg.id] ?? defaultPackageTier(pkg)?.id ?? null,
    [tierByPackage],
  );

  const openRequest = useCallback((pkg: PackageModel, tierId: string, tierName: string) => {
    setRequest({ pkg, tierId, tierName });
  }, []);

  return {
    packages,
    isLoading,
    error,
    hasPackages: packages.length > 0,
    selectedTierId,
    selectTier,
    request,
    openRequest,
    closeRequest: () => setRequest(null),
  };
}
