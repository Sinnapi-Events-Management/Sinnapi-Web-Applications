import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ServiceRegionModel } from '@/lib/types';

/** The region awaiting delete confirmation. */
export type PendingRegionDelete = {
  id: string;
  name: string;
};

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * Owns the confirm-then-delete flow. `service_regions` has no `deleted_at`
 * column, so this would otherwise be a hard delete — but unlike
 * `service_categories`, `vendor_service_regions.region_id` is declared
 * `on delete cascade`, so Postgres would silently wipe the region from every
 * vendor that serves it instead of raising a foreign-key error.
 *
 * To keep that failure visible, this checks usage itself before attempting
 * the delete and blocks client-side when any vendor still references the
 * region, rather than relying on a database error that will never come.
 */
export function useRegionDelete() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingRegionDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const request = useCallback((region: ServiceRegionModel) => {
    setErr(null);
    setPending({ id: region.id, name: region.name });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);

    const { count, error: usageError } = await supabase
      .from('vendor_service_regions')
      .select('id', { count: 'exact', head: true })
      .eq('region_id', pending.id);
    if (usageError) {
      setBusy(false);
      setErr(usageError.message);
      return;
    }
    if (count) {
      setBusy(false);
      setErr(
        `${count} ${pluralize(count, 'vendor', 'vendors')} currently ${pluralize(count, 'serves', 'serve')} this region, so it can’t be deleted. Deactivate it instead.`,
      );
      return;
    }

    const { error } = await supabase.from('service_regions').delete().eq('id', pending.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setPending(null);
    qc.invalidateQueries({ queryKey: ['admin-service-regions'] });
    qc.invalidateQueries({ queryKey: ['service-region-next-sort-order'] });
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}
