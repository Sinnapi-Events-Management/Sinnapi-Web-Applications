import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVendor } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import type { VendorAdminModel } from '@/lib/types';
import { toUpdatePayload, type VendorEditValues } from '../schema';

/** Postgres unique-violation — only `ux_vendors_slug` can raise it on this table. */
const UNIQUE_VIOLATION = '23505';

/**
 * Owns the edit drawer: which vendor is open, the full record behind it, and the
 * write. The list row carries only a projection, so opening fetches the complete
 * vendor through the shared `useVendor` query — the drawer shows a loading state
 * until it lands, and the cached record is reused on reopen.
 */
export function useVendorEdit() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Passing '' keeps the query disabled while the drawer is closed.
  const { data, isLoading, error: loadError } = useVendor(editingId ?? '');
  const vendor = editingId ? (data ?? null) : null;

  const open = useCallback((v: VendorAdminModel) => {
    setErr(null);
    setEditingId(v.id);
  }, []);

  const close = useCallback(() => {
    setEditingId(null);
    setErr(null);
  }, []);

  /** Writes the edit. Returns true on success so the drawer can close itself. */
  const save = useCallback(
    async (values: VendorEditValues): Promise<boolean> => {
      if (!editingId || !vendor) return false;
      setBusy(true);
      setErr(null);
      const { error } = await supabase
        .from('vendors')
        .update(toUpdatePayload(values, { suspended: vendor.status === 'suspended' }))
        .eq('id', editingId);
      setBusy(false);
      if (error) {
        setErr(
          error.code === UNIQUE_VIOLATION
            ? 'That slug is already taken by another vendor. Try a different one.'
            : error.message,
        );
        return false;
      }
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
      qc.invalidateQueries({ queryKey: ['vendor', editingId] });
      return true;
    },
    [editingId, vendor, qc],
  );

  return {
    vendor,
    isOpen: !!editingId,
    loading: !!editingId && isLoading,
    loadError: loadError instanceof Error ? loadError.message : null,
    busy,
    err,
    open,
    close,
    save,
  };
}
