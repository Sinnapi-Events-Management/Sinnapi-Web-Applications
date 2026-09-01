import { useMemo } from 'react';
import { useSavedForm } from '@sinnapi/ui/forms';
import {
  toVendorProfileValues,
  vendorProfileFormSchema,
  type VendorProfileSource,
} from '../schema';
import { useVendorProfileDetails } from './useVendorProfileDetails';

/**
 * Everything the business listing form needs that isn't markup: the projection of
 * the vendor row onto the form's shape, the write, and the dirty/submit machinery
 * binding the two.
 *
 * The `useMemo` is not an optimisation — `useSavedForm` tracks `values` so a
 * background refetch reaches the fields, which means a fresh object every render
 * would reset whatever the vendor was typing. Keeping it here rather than in the
 * section above is what stops that requirement from being something each caller
 * has to remember.
 */
export function useBusinessProfileForm(
  vendorId: string,
  vendor: VendorProfileSource | null | undefined,
  onDone: (message: string) => void,
) {
  const { busy, error, save } = useVendorProfileDetails(vendorId, onDone);
  const values = useMemo(() => toVendorProfileValues(vendor), [vendor]);
  const form = useSavedForm(vendorProfileFormSchema, values, save);

  return { ...form, busy, error };
}
