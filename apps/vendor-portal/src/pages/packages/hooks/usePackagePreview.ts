import { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { emptyPackageValues, formValuesToPreview, type PackageFormValues } from '../schema';

/**
 * The live package the preview panel renders, priced from the form as it
 * stands.
 *
 * WHY THE SUBSCRIPTION LIVES HERE AND NOT IN `usePackageEditor`
 * This watches the WHOLE form — it has to, because any field can change what a
 * client would read — and a watch that broad re-renders whatever component
 * calls it on every keystroke. Held in the editor hook it re-rendered the
 * entire editor: every tier, every line item, the cover field, the terms. Held
 * here it re-renders one panel, which is the only thing that actually changed.
 *
 * The values are spread onto `emptyPackageValues` because a watch mid-typing
 * can return a partial tree, and `formValuesToPreview` prices a whole package.
 */
export function usePackagePreview(control: Control<PackageFormValues>) {
  const values = useWatch({ control }) as PackageFormValues;

  return useMemo(() => formValuesToPreview({ ...emptyPackageValues, ...values }), [values]);
}
