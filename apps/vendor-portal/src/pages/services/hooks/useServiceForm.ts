import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import {
  serviceFormSchema,
  emptyServiceValues,
  serviceToFormValues,
  toServiceInsert,
  toServiceUpdate,
  serviceWriteError,
  type ServiceFormValues,
} from '../schema';
import { useServiceCategoryOptions } from './useServiceCategoryOptions';
import type { ServiceModel } from '@/lib/types';

/**
 * One service's form: its state, its options, and the single write that ends
 * it — an insert or an update, depending on whether it was opened on a
 * service.
 *
 * ONE HOOK FOR BOTH, NOT TWO
 * The two writes differ by a table verb and a `vendor_id`. Everything the
 * vendor actually interacts with — the schema, the category default, the
 * pricing picker, every error the write can produce — is identical, and a
 * second hook for editing would be the same forty lines with an `.update()` in
 * the middle, free to drift on the day one of them gains a field.
 *
 * Everything the dialog needs comes back from here so `ServiceForm` stays a
 * layout: the component decides where the category picker sits, not whether
 * the vendor has a default category.
 */
export function useServiceForm(
  vendorId: string,
  service: ServiceModel | null,
  onSuccess: () => void,
) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const categories = useServiceCategoryOptions();
  const isEdit = service !== null;

  // Computed once per open. The dialog mounts this hook with the dialog and
  // discards it on close, so react-hook-form reading `defaultValues` a single
  // time is exactly what is wanted — the next open is a new form.
  const defaultValues = useMemo<ServiceFormValues>(
    () => (service ? serviceToFormValues(service) : emptyServiceValues),
    [service],
  );

  const { control, handleSubmit, setValue, getValues, formState } = useZodForm(serviceFormSchema, {
    defaultValues,
  });

  // The categories arrive after the form mounts, so the default is applied
  // when it lands rather than at `defaultValues` time. Guarded twice: on the
  // field still being empty, because a vendor who picked a category during the
  // fetch must not have it replaced under them a moment later — and on this
  // being a new service, because filing an existing one somewhere the vendor
  // never chose is a change they did not ask for and would not see.
  useEffect(() => {
    if (isEdit) return;
    if (categories.defaultCategoryId && !getValues('category_id')) {
      setValue('category_id', categories.defaultCategoryId, { shouldDirty: false });
    }
  }, [isEdit, categories.defaultCategoryId, getValues, setValue]);

  const submit = handleSubmit(async (values) => {
    setError(null);

    const { error: writeError } = service
      ? await supabase.from('vendor_services').update(toServiceUpdate(values)).eq('id', service.id)
      : await supabase.from('vendor_services').insert(toServiceInsert(values, vendorId));

    if (writeError) {
      // Mapped, not shown raw. The whole reason this feature was broken is
      // that a vendor was being handed Postgres's own words about a column
      // the form had never rendered.
      setError(serviceWriteError(writeError));
      return;
    }

    qc.invalidateQueries({ queryKey: ['v-services', vendorId] });
    onSuccess();
  });

  return {
    control,
    error,
    busy: formState.isSubmitting,
    submit,
    isEdit,
    categoryOptions: categories.options,
    categoriesLoading: categories.isLoading,
    /**
     * There is no category to file a service under. The form says so and
     * disables the save rather than letting the vendor fill everything in and
     * be refused by a not-null constraint at the end.
     *
     * An edit is exempt: the service already has a category, the field is
     * carrying it, and refusing to save a description change because the
     * taxonomy read failed would be the form breaking over something the
     * vendor is not touching.
     */
    hasNoCategories: !isEdit && !categories.isLoading && categories.options.length === 0,
  };
}
