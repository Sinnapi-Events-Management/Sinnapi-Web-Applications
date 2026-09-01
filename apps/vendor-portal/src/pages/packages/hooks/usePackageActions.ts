import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { packageActionError } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import type { PackageModel } from '@/lib/types';

/** The destructive step, held until the vendor confirms it. */
export type PendingPackageAction = { kind: 'delete'; pkg: PackageModel } | null;

/**
 * Everything a vendor can do to a package that is not editing it.
 *
 * Each one is an RPC rather than a PostgREST write, and deliberately: publish
 * has a readiness check the browser must not be the only enforcer of, delete is
 * a soft delete that also drops visibility, and duplicate has to copy two
 * levels of children. All three are things a `.update()` from here would do
 * half of.
 *
 * Only delete asks for confirmation. Publishing and archiving are one click to
 * undo; a delete is not, and the packages this is reached from are the ones a
 * vendor has spent the most time on.
 */
export function usePackageActions(vendorId: string) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPackageAction>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['v-packages', vendorId] });
  }, [qc, vendorId]);

  const run = useCallback(
    async (id: string, fn: string, args: Record<string, unknown>) => {
      setBusyId(id);
      setError(null);
      const { error: rpcError } = await supabase.rpc(fn, args);
      setBusyId(null);

      if (rpcError) {
        setError(packageActionError(rpcError));
        return false;
      }
      refresh();
      return true;
    },
    [refresh],
  );

  const setVisibility = useCallback(
    (pkg: PackageModel, makePublic: boolean) =>
      run(pkg.id, 'set_quote_package_visibility', {
        p_template_id: pkg.id,
        p_public: makePublic,
      }),
    [run],
  );

  const duplicate = useCallback(
    (pkg: PackageModel) => run(pkg.id, 'duplicate_quote_package', { p_template_id: pkg.id }),
    [run],
  );

  const requestDelete = useCallback((pkg: PackageModel) => {
    setError(null);
    setPending({ kind: 'delete', pkg });
  }, []);

  const cancelPending = useCallback(() => setPending(null), []);

  const confirmPending = useCallback(async () => {
    if (!pending) return;
    const ok = await run(pending.pkg.id, 'delete_quote_package', {
      p_template_id: pending.pkg.id,
    });
    if (ok) setPending(null);
  }, [pending, run]);

  return {
    /** The package currently mid-write, so one card can spin without the grid. */
    busyId,
    error,
    dismissError: () => setError(null),
    pending,
    setVisibility,
    duplicate,
    requestDelete,
    cancelPending,
    confirmPending,
  };
}
