import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ServiceRegionModel } from '@/lib/types';
import { toWritePayload, type RegionFormValues } from '../schema';

/** Postgres unique-violation — `service_regions.key` is unique. */
const UNIQUE_VIOLATION = '23505';

export type RegionDrawerMode = 'create' | 'edit';

/**
 * Owns the region drawer, shared between create and edit. A list row already
 * carries every editable field, so editing needs no extra fetch — the row is
 * handed straight to the form. Create opens the same drawer with a blank form.
 */
export function useRegionEdit() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ServiceRegionModel | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setErr(null);
    setEditing(null);
    setCreating(true);
  }, []);

  const openEdit = useCallback((region: ServiceRegionModel) => {
    setErr(null);
    setCreating(false);
    setEditing(region);
  }, []);

  const close = useCallback(() => {
    setEditing(null);
    setCreating(false);
    setErr(null);
  }, []);

  /** Inserts or updates the region. Returns true on success so the drawer can close itself. */
  const save = useCallback(
    async (values: RegionFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);
      const payload = toWritePayload(values);
      const { error } = editing
        ? await supabase.from('service_regions').update(payload).eq('id', editing.id)
        : await supabase.from('service_regions').insert(payload);
      setBusy(false);
      if (error) {
        setErr(
          error.code === UNIQUE_VIOLATION
            ? 'A region with that key already exists. Change the key.'
            : error.message,
        );
        return false;
      }
      close();
      qc.invalidateQueries({ queryKey: ['admin-service-regions'] });
      qc.invalidateQueries({ queryKey: ['service-region-next-sort-order'] });
      return true;
    },
    [editing, qc, close],
  );

  return {
    isOpen: creating || !!editing,
    mode: (creating ? 'create' : 'edit') as RegionDrawerMode,
    region: editing,
    busy,
    err,
    openCreate,
    openEdit,
    close,
    save,
  };
}
