import { useCallback, useState } from 'react';
import { useOfferModeration } from '@/hooks/queries';
import type { AdminOfferModel } from '@/lib/types';

/** A withdrawal held open until the operator states a reason for it. */
export type PendingSuspension = { offer: AdminOfferModel } | null;

/**
 * The three writes the console has over an offer, and the state around them.
 *
 * WHY THIS IS NOT PART OF THE OFFERS PAGE
 * An operator reaches an offer from two directions: the platform-wide console,
 * and the vendor they are already investigating. Those two screens list offers
 * completely differently — a paged table against a card grid scoped to one
 * vendor — but the *decision* is identical, and so are its consequences: the
 * reason is required, a code under a campaign takes the campaign with it, and
 * featuring only exists for a campaign. Duplicating that in two hooks is how
 * one screen quietly loses the campaign rule.
 *
 * So the listing stays with each page and only the acting is shared. This hook
 * owns no query, no tab and no paging — just which offer is pending, why, and
 * which one is mid-write.
 *
 * WHY A WITHDRAWAL IS A DIALOG AND A RESTORE IS NOT
 * `admin_set_discount_suspended` requires a reason and refuses without one, and
 * that requirement is the point rather than a formality: the reason is written
 * to the row, sent to the vendor in the notification, and is the only defence
 * the platform has when a vendor asks why their campaign was taken off a public
 * page. A restore needs no such record — putting something back is not a
 * decision anybody has to justify to the person it benefits.
 *
 * WITHDRAW ACTS ON THE CAMPAIGN WHEN THERE IS ONE
 * A code under a campaign is one of several; taking down only that code leaves
 * the campaign's banner and its other codes live, which is almost never what an
 * operator responding to "this vendor is advertising 70% off" means. So the
 * write is routed to `admin_set_promotion_suspended` where a campaign exists —
 * `discount_is_live` tests the campaign, so every code under it goes dark
 * without a single discount row being touched. A standalone code is suspended
 * on its own.
 */
export function useOfferModerationFlow() {
  const { suspendDiscount, suspendPromotion, setFeatured } = useOfferModeration();

  const [pending, setPending] = useState<PendingSuspension>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const requestSuspend = useCallback((offer: AdminOfferModel) => {
    setActionError(null);
    setReason('');
    setPending({ offer });
  }, []);

  const cancelSuspend = useCallback(() => {
    setPending(null);
    setReason('');
  }, []);

  const confirmSuspend = useCallback(async () => {
    if (!pending) return;
    const { offer } = pending;

    setBusyId(offer.discount_id);
    setActionError(null);
    try {
      // The campaign when there is one — see the note on this hook.
      if (offer.promotion_id) {
        await suspendPromotion.mutateAsync({ id: offer.promotion_id, suspended: true, reason });
      } else {
        await suspendDiscount.mutateAsync({ id: offer.discount_id, suspended: true, reason });
      }
      setPending(null);
      setReason('');
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not withdraw this offer.');
    } finally {
      setBusyId(null);
    }
  }, [pending, reason, suspendPromotion, suspendDiscount]);

  const restore = useCallback(
    async (offer: AdminOfferModel) => {
      setBusyId(offer.discount_id);
      setActionError(null);
      try {
        if (offer.promotion_id) {
          await suspendPromotion.mutateAsync({ id: offer.promotion_id, suspended: false });
        } else {
          await suspendDiscount.mutateAsync({ id: offer.discount_id, suspended: false });
        }
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : 'Could not restore this offer.');
      } finally {
        setBusyId(null);
      }
    },
    [suspendPromotion, suspendDiscount],
  );

  const toggleFeatured = useCallback(
    async (offer: AdminOfferModel) => {
      if (!offer.promotion_id) return;
      setBusyId(offer.discount_id);
      setActionError(null);
      try {
        await setFeatured.mutateAsync({ id: offer.promotion_id, featured: !offer.is_featured });
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : 'Could not change featuring.');
      } finally {
        setBusyId(null);
      }
    },
    [setFeatured],
  );

  return {
    busyId,
    actionError,
    dismissActionError: useCallback(() => setActionError(null), []),
    pending,
    reason,
    setReason,
    requestSuspend,
    cancelSuspend,
    confirmSuspend,
    restore,
    toggleFeatured,
    /** True only while the dialog's own write is in flight, not a row restore. */
    isSuspending: busyId !== null && pending !== null,
  };
}
