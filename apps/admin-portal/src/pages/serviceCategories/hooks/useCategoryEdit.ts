import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ServiceCategoryModel } from '@/lib/types';
import { toWritePayload, type CategoryFormValues } from '../schema';

/** Postgres unique-violation — `service_categories.key` is unique. */
const UNIQUE_VIOLATION = '23505';

export type CategoryDrawerMode = 'create' | 'edit';

/**
 * Owns the category drawer, shared between create and edit. A list row
 * already carries every editable field, so editing needs no extra fetch —
 * the row is handed straight to the form. Create opens the same drawer with
 * a blank form.
 */
export function useCategoryEdit() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ServiceCategoryModel | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setErr(null);
    setEditing(null);
    setCreating(true);
  }, []);

  const openEdit = useCallback((category: ServiceCategoryModel) => {
    setErr(null);
    setCreating(false);
    setEditing(category);
  }, []);

  const close = useCallback(() => {
    setEditing(null);
    setCreating(false);
    setErr(null);
  }, []);

  /** Inserts or updates the category. Returns true on success so the drawer can close itself. */
  const save = useCallback(
    async (values: CategoryFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);
      const payload = toWritePayload(values);
      const { error } = editing
        ? await supabase.from('service_categories').update(payload).eq('id', editing.id)
        : await supabase.from('service_categories').insert(payload);
      setBusy(false);
      if (error) {
        setErr(
          error.code === UNIQUE_VIOLATION
            ? 'A category with that key already exists. Change the key.'
            : error.message,
        );
        return false;
      }
      close();
      qc.invalidateQueries({ queryKey: ['admin-service-categories'] });
      qc.invalidateQueries({ queryKey: ['service-category-options'] });
      qc.invalidateQueries({ queryKey: ['service-category-next-sort-order'] });
      return true;
    },
    [editing, qc, close],
  );

  return {
    isOpen: creating || !!editing,
    mode: (creating ? 'create' : 'edit') as CategoryDrawerMode,
    category: editing,
    busy,
    err,
    openCreate,
    openEdit,
    close,
    save,
  };
}
