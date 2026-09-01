import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { packageActionError } from '@sinnapi/ui';
import { groupOffersByPackage, offersForTier } from '@sinnapi/ui/offers';
import { supabase } from '@/lib/supabase';
import { useAdminVendorPackageOffers, useVendorPackagesAdmin } from '@/hooks/queries';
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
 *
 * The live offers on those packages are read here too, and for a reason that is
 * not convenience: a complaint about a package is nearly always a complaint
 * about its price, and the price a client sees is the discounted one. A console
 * showing a list price while the public sees a sale price is deciding about a
 * different offer from the one that was reported.
 *
 * That read never gates the tab. A failure costs the cards their offer ribbons,
 * which is a worse page than one with them and a much better page than an empty
 * one — so its loading and error state are deliberately not returned.
 */
export function useVendorPackageModeration(vendorId?: string) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useVendorPackagesAdmin(vendorId);

  const offers = useAdminVendorPackageOffers(vendorId);

  // Indexed once per fetch. Filtering inside the card map would walk the whole
  // row set per card on every render, which is thirty comparisons a card for a
  // list that changes only when the query does.
  const offersByPackage = useMemo(() => groupOffersByPackage(offers.data), [offers.data]);

  /**
   * The offers touching one package, at package level.
   *
   * `null` for the tier asks "does anything here touch this package at all",
   * which is the right question for a console that shows every tier of the
   * showcase rather than following a client's tier selection — a tier-scoped
   * saving still has to appear, labelled by the showcase as the tier's own.
   */
  const offersFor = useCallback(
    (pkg: PackageModel) => offersForTier(offersByPackage.get(pkg.id), null),
    [offersByPackage],
  );

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
    offersFor,
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
