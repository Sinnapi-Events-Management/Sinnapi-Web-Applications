import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ServiceRegionModel } from '@/lib/types';
import {
  emptyRegionValues,
  regionFormSchema,
  slugify,
  toFormValues,
  type RegionFormValues,
} from '../schema';

/**
 * Wires the region form to react-hook-form: zod validates, `values` keeps the
 * fields in step with the region being edited (or the blank defaults when
 * creating).
 *
 * The key has no input of its own — it's derived from the name. On create it
 * tracks the name live; on edit it stays exactly as loaded, since the key is
 * a stable token baked into `search_vendors_public` and web-public's static
 * category/region lists, and silently rewriting it on a rename would break
 * both.
 *
 * `nextSortOrder` seeds the create form's sort order so an admin isn't left
 * guessing a number — it stays editable, this only picks the starting value.
 */
export function useRegionForm(
  region: ServiceRegionModel | null,
  nextSortOrder: number,
  onSave: (values: RegionFormValues) => Promise<boolean>,
) {
  const values = useMemo(
    () =>
      region ? toFormValues(region) : { ...emptyRegionValues, sort_order: String(nextSortOrder) },
    [region, nextSortOrder],
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty },
  } = useForm<RegionFormValues>({
    resolver: zodResolver(regionFormSchema),
    values,
  });

  const name = useWatch({ control, name: 'name' });
  const isCreate = !region;
  useEffect(() => {
    if (isCreate) setValue('key', slugify(name ?? ''), { shouldDirty: true });
    // Only create mode auto-derives the key; `name`/`isCreate` are the only
    // real dependencies — `setValue` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isCreate]);

  return {
    control,
    isDirty,
    submit: handleSubmit(async (v) => {
      await onSave(v);
    }),
  };
}
