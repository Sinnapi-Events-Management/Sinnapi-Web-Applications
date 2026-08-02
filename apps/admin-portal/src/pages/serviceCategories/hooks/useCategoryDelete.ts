import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ServiceCategoryModel } from '@/lib/types';

/** The category awaiting delete confirmation. */
export type PendingCategoryDelete = {
  id: string;
  name: string;
};

/**
 * Postgres foreign-key violation — raised here by any of `service_categories`
 * (subcategories via parent_id), `vendors`/`vendor_applications`
 * (primary_category_id) or `vendor_services` (category_id), none of which
 * cascade on delete.
 */
const FK_VIOLATION = '23503';

/**
 * Owns the confirm-then-delete flow. `service_categories` has no `deleted_at`
 * column, so this is a hard delete — the database itself blocks it while any
 * subcategory or vendor-facing row still references the category, surfaced
 * as guidance to deactivate instead.
 */
export function useCategoryDelete() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingCategoryDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const request = useCallback((category: ServiceCategoryModel) => {
    setErr(null);
    setPending({ id: category.id, name: category.name });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('service_categories').delete().eq('id', pending.id);
    setBusy(false);
    if (error) {
      setErr(
        error.code === FK_VIOLATION
          ? 'This category has subcategories or vendors attached, so it can’t be deleted. Deactivate it instead.'
          : error.message,
      );
      return;
    }
    setPending(null);
    qc.invalidateQueries({ queryKey: ['admin-service-categories'] });
    qc.invalidateQueries({ queryKey: ['service-category-options'] });
    qc.invalidateQueries({ queryKey: ['service-category-next-sort-order'] });
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}
