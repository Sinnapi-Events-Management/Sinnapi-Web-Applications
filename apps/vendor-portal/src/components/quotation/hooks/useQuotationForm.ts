import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { defaultPackageTier, packageAddOns, packageTiers, type PackageTierLike } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { useQuotablePackages } from '@/hooks/queries';
import type { PackageModel } from '@/lib/types';
import {
  addOnToQuotationItem,
  quotationFormSchema,
  emptyQuotationValues,
  emptyQuotationItem,
  quotationFormPricing,
  packageToQuotationValues,
  toSendQuotationArgs,
} from '../schema';

export type QuotationFormOptions = {
  vendorId?: string;
  /** The package the client asked about, when they requested against one. */
  requestedPackageId?: string | null;
  requestedTierId?: string | null;
};

/**
 * Builds and sends a quotation's line items.
 *
 * `useFieldArray` owns the rows so each one carries its own validation state —
 * an earlier version filtered blank descriptions out silently at send time,
 * which meant a mistyped row vanished from the quote without the vendor ever
 * being told. Now an incomplete row blocks the send and says which field is
 * wrong.
 *
 * The total is derived from watched values rather than stored, so it can never
 * disagree with what the vendor is looking at.
 *
 * WHAT PACKAGES ADD
 * A vendor with priced packages should not be retyping one of them into every
 * request. `applyPackage` resets the form from a tier — lines, discount, tax,
 * validity, advance terms — and `addAddOn` appends one extra at a time. The
 * package is recorded on the quote so the client's page can name the offer they
 * are looking at.
 *
 * And when the client requested a specific package, the builder opens on it.
 * That is the case worth optimising: the client has already said what they
 * want, and making the vendor find it again in a dropdown is asking them to
 * redo work the request already did.
 */
export function useQuotationForm(quotationId: string, options: QuotationFormOptions = {}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: packages, isLoading: isPackagesLoading } = useQuotablePackages(options.vendorId);

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useZodForm(quotationFormSchema, { defaultValues: emptyQuotationValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  // Watched so the totals and the advance preview stay in step with what the
  // vendor types, for the same reason the total is derived rather than stored.
  const discountRate = useWatch({ control, name: 'discount_rate' });
  const taxRate = useWatch({ control, name: 'tax_rate' });
  const taxInclusive = useWatch({ control, name: 'tax_inclusive' });
  const advanceRate = useWatch({ control, name: 'advance_rate' });
  const advanceDays = useWatch({ control, name: 'advance_release_days_before' });
  const appliedPackageId = useWatch({ control, name: 'template_id' });
  const appliedTierId = useWatch({ control, name: 'template_tier_id' });

  const pricing = useMemo(
    () =>
      quotationFormPricing({
        items: items ?? [],
        discount_rate: discountRate,
        tax_rate: taxRate,
        tax_inclusive: taxInclusive,
      }),
    [items, discountRate, taxRate, taxInclusive],
  );

  const applied = useMemo(
    () => (packages ?? []).find((pkg) => pkg.id === appliedPackageId) ?? null,
    [packages, appliedPackageId],
  );

  const applyPackage = useCallback(
    (pkg: PackageModel, tier: PackageTierLike) => {
      // `reset` rather than field-by-field `setValue`: applying a package
      // replaces the quote, and a partial write would leave the previous
      // package's extra rows behind under `useFieldArray`'s own keys.
      reset(packageToQuotationValues(pkg, tier, getValues()));
    },
    [reset, getValues],
  );

  /**
   * Seeds the builder from the package the client requested, once.
   *
   * Guarded by a ref rather than by comparing form state, because the vendor is
   * allowed to clear or change the package afterwards — a re-run keyed on
   * "template_id is empty" would undo that on the next render.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !options.requestedPackageId || !packages) return;
    const pkg = packages.find((entry) => entry.id === options.requestedPackageId);
    if (!pkg) return;

    const tier =
      packageTiers(pkg).find((entry) => entry.id === options.requestedTierId) ??
      defaultPackageTier(pkg);
    if (!tier) return;

    seeded.current = true;
    applyPackage(pkg, tier);
  }, [packages, options.requestedPackageId, options.requestedTierId, applyPackage]);

  const clearPackage = useCallback(() => {
    setValue('template_id', '');
    setValue('template_tier_id', '');
  }, [setValue]);

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      'send_quotation',
      toSendQuotationArgs(values, quotationId),
    );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-quotation', quotationId] });
    qc.invalidateQueries({ queryKey: ['v-quotations'] });
  });

  return {
    control,
    error,
    busy: isSubmitting,
    fields,
    /** The array-level message, e.g. every row was removed. */
    itemsError: errors.items?.root?.message ?? errors.items?.message,
    pricing,
    /** Kept for callers that only want the pre-tax figure. */
    total: pricing.base,
    advanceRate: advanceRate ?? '0',
    advanceDays: advanceDays ?? '0',
    addItem: () => append(emptyQuotationItem),
    removeItem: remove,

    packages: packages ?? [],
    isPackagesLoading,
    applied,
    appliedTierId: appliedTierId || null,
    /** The add-ons the applied package offers, for the one-click append row. */
    availableAddOns: useMemo(() => packageAddOns(applied ?? undefined), [applied]),
    applyPackage,
    clearPackage,
    addAddOn: (line: Parameters<typeof addOnToQuotationItem>[0]) =>
      append(addOnToQuotationItem(line)),

    submit,
  };
}
