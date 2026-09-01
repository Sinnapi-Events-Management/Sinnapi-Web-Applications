import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { serviceWriteError } from '../schema';
import type { ServiceRow } from './useServices';

/** The archive step, held on screen until the vendor confirms it. */
export type PendingServiceAction = { kind: 'archive'; service: ServiceRow } | null;

/**
 * Everything a vendor can do to a service that is not editing its fields.
 *
 * THREE WRITES, ALL POSTGREST, NO RPC
 * The packages screen goes through RPCs because publishing has a readiness
 * check and duplicating copies two levels of children — things a `.update()`
 * from the browser would only do half of. A service has neither. `vsvc_write`
 * is `for all` to `is_vendor_owner`, so the row is the vendor's to change, and
 * the three statements here are complete in themselves:
 *
 *   hide / show   update is_active           reversible in one click
 *   archive       DELETE                     see below
 *   restore       update deleted_at → null   puts it back where it was
 *
 * ARCHIVE IS A `DELETE` STATEMENT AND A SOFT DELETE ANYWAY
 * `trg_soft_delete` fires BEFORE DELETE on every table carrying a `deleted_at`
 * column, stamps the row and cancels the physical delete. So this sends the
 * statement that says what the vendor meant, and the database keeps the row —
 * which is what makes Restore possible, and what keeps the `bookings`
 * → `vendor_services` foreign key (no `on delete` clause, so a real delete
 * would be refused) from ever being tested. A vendor's past bookings cannot be
 * broken by tidying their catalogue.
 *
 * Only the archive asks for confirmation, and `ServiceArchiveDialog` decides
 * whether it is even allowed. Hide and Restore are one click to undo.
 */
export function useServiceActions(vendorId: string) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingServiceAction>(null);

  const run = useCallback(
    async (id: string, write: () => PromiseLike<{ error: unknown }>) => {
      setBusyId(id);
      setError(null);
      const { error: writeError } = await write();
      setBusyId(null);

      if (writeError) {
        // Mapped, never raw. A vendor should not be handed Postgres's words
        // about a table they do not know exists.
        setError(serviceWriteError(writeError));
        return false;
      }
      // Prefix key: refreshes both this screen's archived-inclusive read and
      // the live-only one the package editor's service picker holds.
      qc.invalidateQueries({ queryKey: ['v-services', vendorId] });
      return true;
    },
    [qc, vendorId],
  );

  const setVisibility = useCallback(
    (service: ServiceRow, visible: boolean) =>
      run(service.id, () =>
        supabase.from('vendor_services').update({ is_active: visible }).eq('id', service.id),
      ),
    [run],
  );

  const restore = useCallback(
    (service: ServiceRow) =>
      run(service.id, () =>
        supabase
          .from('vendor_services')
          // `deleted_by` goes with it: a row that is not deleted has nobody who
          // deleted it, and leaving the stamp behind would make the next
          // archive's audit trail read as though it never happened.
          .update({ deleted_at: null, deleted_by: null })
          .eq('id', service.id),
      ),
    [run],
  );

  const requestArchive = useCallback((service: ServiceRow) => {
    setError(null);
    setPending({ kind: 'archive', service });
  }, []);

  const cancelPending = useCallback(() => setPending(null), []);

  const confirmPending = useCallback(async () => {
    if (!pending) return;
    const ok = await run(pending.service.id, () =>
      supabase.from('vendor_services').delete().eq('id', pending.service.id),
    );
    if (ok) setPending(null);
  }, [pending, run]);

  return {
    /** The service currently mid-write, so one card can spin without the grid. */
    busyId,
    error,
    dismissError: useCallback(() => setError(null), []),
    pending,
    setVisibility,
    restore,
    requestArchive,
    cancelPending,
    confirmPending,
  };
}
