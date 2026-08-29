import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { packageActionError } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { useVendorPackagesAdmin } from '@/hooks/queries';
import type { PackageModel } from '@/lib/types';

/**
 * The console's reach over a vendor's packages: read all of them, take one off
 * the market, put it back.
 *
 * There is no edit. A package is a vendor's own offer, and the console's job is
 * to stop a bad one being shown, not to rewrite what someone is selling —
 * `save_quote_package` refuses a caller who is not the owning vendor for
 * exactly that reason.
 *
 * A take-down demands a reason, and the server enforces that rather than this
 * dialog: the vendor is notified with the reason quoted back to them, so an
 * empty one would produce a notification that says a package vanished and
 * nothing about why.
 */
export function useVendorPackageModeration(vendorId?: string) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useVendorPackagesAdmin(vendorId);

  const [pending, setPending] = useState<PackageModel | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin-vendor-packages', vendorId] });
  }, [qc, vendorId]);

  const requestUnpublish = useCallback((pkg: PackageModel) => {
    setActionError(null);
    setReason('');
    setPending(pkg);
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirmUnpublish = useCallback(async () => {
    if (!pending) return;
    setBusyId(pending.id);
    setActionError(null);

    const { error: rpcError } = await supabase.rpc('admin_unpublish_quote_package', {
      p_template_id: pending.id,
      p_reason: reason.trim(),
    });
    setBusyId(null);

    if (rpcError) {
      setActionError(packageActionError(rpcError));
      return;
    }
    setPending(null);
    refresh();
  }, [pending, reason, refresh]);

  const restore = useCallback(
    async (pkg: PackageModel) => {
      setBusyId(pkg.id);
      setActionError(null);
      const { error: rpcError } = await supabase.rpc('admin_restore_quote_package', {
        p_template_id: pkg.id,
      });
      setBusyId(null);
      if (rpcError) {
        setActionError(packageActionError(rpcError));
        return;
      }
      refresh();
    },
    [refresh],
  );

  return {
    packages: data ?? [],
    isLoading,
    error,
    busyId,
    actionError,
    dismissError: () => setActionError(null),
    pending,
    reason,
    setReason,
    requestUnpublish,
    cancel,
    confirmUnpublish,
    restore,
  };
}
