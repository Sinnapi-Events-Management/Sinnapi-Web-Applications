import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { VendorDetailModel } from '@/lib/types';
import { toFormValues, vendorEditSchema, type VendorEditValues } from '../schema';

/**
 * Wires the edit form to the vendor record: zod validates, and `values` keeps the
 * fields in step with the fetched vendor so the drawer can render before the
 * record lands and re-populate when it does.
 */
export function useVendorEditForm(
  vendor: VendorDetailModel,
  onSave: (values: VendorEditValues) => Promise<boolean>,
) {
  const values = useMemo(() => toFormValues(vendor), [vendor]);

  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<VendorEditValues>({
    resolver: zodResolver(vendorEditSchema),
    values,
  });

  return {
    control,
    /** Suspended vendors are pinned to hidden — see `toUpdatePayload`. */
    suspended: vendor.status === 'suspended',
    isDirty,
    submit: handleSubmit(async (v) => {
      await onSave(v);
    }),
  };
}
