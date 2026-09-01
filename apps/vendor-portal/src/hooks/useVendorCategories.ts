import { useCallback, useMemo } from 'react';
import { useServices } from '@/hooks/queries';
import { useVendorContext } from '@/vendor/VendorProvider';

/**
 * The service categories this vendor may quote for.
 *
 * The browser-side mirror of `vendor_serves_category` (migration 0901l), and it
 * has to stay a mirror rather than a second opinion: the server is the
 * enforcement, and this exists only so a vendor is never shown a button the
 * server is about to refuse. Both halves of the rule are reproduced exactly —
 * the category the vendor was approved under, plus every category they offer an
 * ACTIVE, undeleted service in.
 *
 * Neither read is new. `primary_category_id` already rides on the vendor
 * context, and `useServices` is the same query the services screen and the
 * package editor use, so this costs a cache hit rather than a request — and a
 * vendor who publishes a service in a new category sees the plan's buttons
 * unlock as soon as that query is invalidated.
 *
 * `isLoading` matters more here than it usually does. An empty set and a set
 * that has not arrived look identical, and treating "not yet" as "you do not do
 * this work" would grey out every line on the plan for the first few hundred
 * milliseconds. Callers must gate on this before withholding anything.
 */
export function useVendorCategories() {
  const { vendor } = useVendorContext();
  const { data, isLoading } = useServices(vendor?.id);

  const categoryIds = useMemo(() => {
    const ids = new Set<string>();
    if (vendor?.primary_category_id) ids.add(vendor.primary_category_id);
    for (const service of data ?? []) {
      if (service.is_active && service.category_id) ids.add(service.category_id);
    }
    return ids;
  }, [vendor?.primary_category_id, data]);

  // Stable across renders, because the plan hook memoises on it — an inline
  // arrow would be a new identity every render and would defeat that memo
  // entirely, re-partitioning and re-sorting the whole plan on each paint.
  const serves = useCallback(
    (categoryId: string | null) => categoryId === null || categoryIds.has(categoryId),
    [categoryIds],
  );

  return {
    categoryIds,
    isLoading,
    /** Mirrors `vendor_serves_category`; a null category is nothing to check. */
    serves,
    /** No approval category and no live service — nothing can be quoted for. */
    hasNone: !isLoading && categoryIds.size === 0,
  };
}
