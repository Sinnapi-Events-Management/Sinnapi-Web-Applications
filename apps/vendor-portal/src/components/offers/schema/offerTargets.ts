import type { OfferTargetModel, PackageModel, ServiceModel } from '@/lib/types';

/**
 * A target as the picker holds it, before it is a row.
 *
 * A string key rather than the three nullable id columns, because the picker's
 * whole job is set membership — "is this tier ticked" — and a Set of strings
 * answers that in one comparison where a list of objects needs a predicate at
 * every render. `toTargetRows` turns the set back into rows at save time.
 */
export type TargetKey = string;

export const SERVICE_PREFIX = 'service:';
export const PACKAGE_PREFIX = 'package:';
export const TIER_PREFIX = 'tier:';

export function serviceKey(id: string): TargetKey {
  return `${SERVICE_PREFIX}${id}`;
}
export function packageKey(id: string): TargetKey {
  return `${PACKAGE_PREFIX}${id}`;
}
/** Carries the package id too: a tier row needs both columns to be written. */
export function tierKey(packageId: string, tierId: string): TargetKey {
  return `${TIER_PREFIX}${packageId}:${tierId}`;
}

/** The keys an offer's existing rows correspond to. */
export function toTargetKeys(targets: readonly OfferTargetModel[]): TargetKey[] {
  return targets
    .map((target) => {
      if (target.kind === 'vendor_service' && target.vendor_service_id) {
        return serviceKey(target.vendor_service_id);
      }
      if (target.kind === 'package' && target.package_id) return packageKey(target.package_id);
      if (target.kind === 'package_tier' && target.package_id && target.tier_id) {
        return tierKey(target.package_id, target.tier_id);
      }
      return null;
    })
    .filter((key): key is TargetKey => key !== null);
}

/** The `offer_targets` columns for one key, minus the owner. */
export function toTargetRow(
  key: TargetKey,
): Pick<OfferTargetModel, 'kind' | 'package_id' | 'tier_id' | 'vendor_service_id'> | null {
  if (key.startsWith(SERVICE_PREFIX)) {
    return {
      kind: 'vendor_service',
      package_id: null,
      tier_id: null,
      vendor_service_id: key.slice(SERVICE_PREFIX.length),
    };
  }
  if (key.startsWith(PACKAGE_PREFIX)) {
    return {
      kind: 'package',
      package_id: key.slice(PACKAGE_PREFIX.length),
      tier_id: null,
      vendor_service_id: null,
    };
  }
  if (key.startsWith(TIER_PREFIX)) {
    const [packageId, tierId] = key.slice(TIER_PREFIX.length).split(':');
    if (!packageId || !tierId) return null;
    return {
      kind: 'package_tier',
      package_id: packageId,
      tier_id: tierId,
      vendor_service_id: null,
    };
  }
  return null;
}

/**
 * Ticking a whole package clears its tiers, and vice versa.
 *
 * The two are not additive: a `package` row already covers every tier, so a
 * package row plus a tier row of the same package is a target set that says the
 * same thing twice and reads, on the client's card, as an offer scoped to one
 * tier — `package_offers` derives its `scope` from whether any `package_tier`
 * row exists. Enforcing the choice here is what keeps the badge honest.
 */
export function toggleTarget(current: Set<TargetKey>, key: TargetKey): Set<TargetKey> {
  const next = new Set(current);

  if (next.has(key)) {
    next.delete(key);
    return next;
  }

  if (key.startsWith(PACKAGE_PREFIX)) {
    const packageId = key.slice(PACKAGE_PREFIX.length);
    for (const existing of next) {
      if (existing.startsWith(`${TIER_PREFIX}${packageId}:`)) next.delete(existing);
    }
  }
  if (key.startsWith(TIER_PREFIX)) {
    const packageId = key.slice(TIER_PREFIX.length).split(':')[0];
    next.delete(packageKey(packageId));
  }

  next.add(key);
  return next;
}

/**
 * What the vendor has chosen, in one sentence.
 *
 * Shown above the picker because the set is the thing being decided and the
 * list is only how it is decided — a vendor who has ticked four boxes across a
 * scrolling list of nine packages should not have to scroll back to find out
 * what they said.
 */
export function targetSummary(
  keys: ReadonlySet<TargetKey>,
  packages: readonly PackageModel[],
  services: readonly ServiceModel[],
): string {
  if (keys.size === 0) return 'Everything you sell';

  const names: string[] = [];
  for (const key of keys) {
    if (key.startsWith(SERVICE_PREFIX)) {
      const id = key.slice(SERVICE_PREFIX.length);
      const service = services.find((entry) => entry.id === id);
      if (service) names.push(`${service.title} (all packages)`);
      continue;
    }
    if (key.startsWith(PACKAGE_PREFIX)) {
      const id = key.slice(PACKAGE_PREFIX.length);
      const pkg = packages.find((entry) => entry.id === id);
      if (pkg) names.push(pkg.name);
      continue;
    }
    const [packageId, tierId] = key.slice(TIER_PREFIX.length).split(':');
    const pkg = packages.find((entry) => entry.id === packageId);
    const tier = pkg?.quote_template_tiers?.find((entry) => entry.id === tierId);
    if (pkg && tier) names.push(`${pkg.name} — ${tier.name}`);
  }

  if (names.length === 0) return 'Everything you sell';
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}
