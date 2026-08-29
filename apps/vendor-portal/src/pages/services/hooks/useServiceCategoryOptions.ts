import { useMemo } from 'react';
import type { SelectOption } from '@sinnapi/ui/forms';
import { useServiceCategories } from '@/hooks/queries';
import { useVendorContext } from '@/vendor/VendorProvider';

/**
 * The category picker's options, and the one it should open on.
 *
 * The default is the vendor's own `primary_category_id` — the category they
 * were approved under. That is the same value
 * `tg_vendor_services_default_category` falls back to in the database, and the
 * two agreeing is deliberate: a vendor who never touches the field gets the
 * same category whether the form sent one or the trigger filled it in.
 *
 * `defaultCategoryId` is empty until the categories have loaded AND the
 * vendor's own category is among them. Pre-selecting an id the list does not
 * contain leaves MUI's Select showing a blank box that the vendor cannot
 * clear and cannot explain.
 */
export function useServiceCategoryOptions() {
  const { data, isLoading, error } = useServiceCategories();
  const { vendor } = useVendorContext();

  const options = useMemo<SelectOption[]>(
    () => (data ?? []).map((category) => ({ value: category.id, label: category.name })),
    [data],
  );

  const primaryId = vendor?.primary_category_id ?? '';
  const defaultCategoryId = options.some((option) => option.value === primaryId) ? primaryId : '';

  return { options, defaultCategoryId, isLoading, error };
}
