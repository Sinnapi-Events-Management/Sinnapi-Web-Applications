import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { quotationActionError } from '@sinnapi/ui';
import { offerSaving } from '@sinnapi/ui/offers';
import { supabase } from '@/lib/supabase';
import { usePackageQuoteTerms } from '@/hooks/queries';
import type { QuotationDetailModel } from '@/lib/types';

export type PackageApprovalAction = 'approve' | 'decline';

/**
 * Approving or declining a package order.
 *
 * WHAT THE VENDOR IS ACTUALLY DECIDING
 * Not a price — that was settled when the client ordered, and 0903b makes sure
 * of it. Only whether they will do this work, on this date, at the published
 * figure. So there is no builder here, no line-item array and no tax field:
 * every one of those would be a control the server refuses.
 *
 * The single lever is the discount rate, and it moves in one direction. The
 * floor arrives from `package_quote_terms` rather than being computed here,
 * because a floor the browser derives is a floor that can disagree with the one
 * the trigger enforces — and the client is entitled to exactly one answer about
 * what they were promised.
 *
 * APPROVING BINDS IMMEDIATELY
 * There is no round trip back to the client. `respond_package_quotation` moves
 * the quote to `accepted`, the reservation the client has held since they
 * ordered becomes a redemption, and the client's next screen is the booking
 * form. That is safe only because the total cannot rise; if that guard is ever
 * relaxed, this flow has to grow a client confirmation step.
 */
export function usePackageQuoteApproval(quotation: QuotationDetailModel | null | undefined) {
  const qc = useQueryClient();
  const quotationId = quotation?.id;

  const isPackageOrder = quotation?.quote_origin === 'package';
  const isPending = isPackageOrder && quotation?.status === 'requested';

  const { data: terms, isLoading: isTermsLoading } = usePackageQuoteTerms(
    quotationId,
    isPackageOrder,
  );

  const [pending, setPending] = useState<PackageApprovalAction | null>(null);
  const [reason, setReason] = useState('');

  /**
   * EXTRA percentage points, not the quote's discount rate.
   *
   * The field used to ask for the absolute tier rate with a floor under it, and
   * vendors could not read it. In the common case the tier's own `discount_rate`
   * is 0 and the client's saving is entirely a campaign offer — so the control
   * said "Your discount (%)", pre-filled `0`, helper "At least 0%", directly
   * beneath a card reading "15% off". Two different percentages, neither named,
   * and a pre-filled value that had to be EXCEEDED to mean anything, which made
   * the default state look like an unanswered required field.
   *
   * Asking for the increment removes all three at once: 0 means "approve as
   * ordered", any positive number means "give them this much more", and there is
   * only ever one percentage on screen. `confirm` adds it back onto the floor
   * before sending, because the RPC and the trigger still speak in absolute
   * rates — and they should, since the floor is what they enforce.
   */
  const [extraDiscount, setExtraDiscount] = useState<string>('0');
  /** Whether the vendor has opened the optional sweetener at all. */
  const [isSweetening, setSweetening] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minRate = terms?.min_discount_rate ?? quotation?.discount_rate ?? 0;

  const request = useCallback((action: PackageApprovalAction) => {
    setError(null);
    setReason('');
    setExtraDiscount('0');
    // Closed every time. Approving as ordered is the overwhelmingly common
    // answer, and a control that is open by default is a question being asked.
    setSweetening(false);
    setPending(action);
  }, []);

  const cancel = useCallback(() => {
    setError(null);
    setPending(null);
  }, []);

  /**
   * Whether the confirm button may fire.
   *
   * Two separate reasons it may not, kept apart because they need different
   * sentences: a decline with no note, and an approval at a rate below the
   * floor. Checked here as well as by the trigger — the trigger is the
   * enforcement, this is the UI declining to send something it knows will be
   * refused, which is a different job.
   */
  const extraValue = extraDiscount.trim() === '' ? 0 : Number(extraDiscount);
  const isExtraValid =
    Number.isFinite(extraValue) && extraValue >= 0 && minRate + extraValue <= 100;

  /** The absolute tier rate this approval would send. */
  const nextRate = isExtraValid ? minRate + extraValue : minRate;

  /**
   * What the client would pay at the rate now in the field.
   *
   * The earlier version showed only the vendor's own discount LINE, on the
   * grounds that a browser could not faithfully re-derive a capped or fixed
   * offer. That was true then and is no longer: 0903g returns the offer's type,
   * value and cap, and `offerSaving` mirrors `resolve_discount_amount` clause
   * for clause — it is the same function the client's order dialog prices with,
   * so both sides of one deal now project from one implementation.
   *
   * It still projects rather than promises. `respond_package_quotation`
   * recomputes everything server-side from the tier's own rows, and that figure
   * is the one that binds; this is here so a vendor typing "5" can see what it
   * costs instead of committing to an unknown.
   *
   * Follows the same five lines as `price_package_tier`: the offer lands on the
   * post-tier-discount net, and tax is recomputed on what is left.
   */
  const projection = useMemo(() => {
    const base = terms?.locked_subtotal ?? 0;
    if (!isExtraValid || base <= 0) return null;

    const tierDiscount = round2((base * nextRate) / 100);
    const after = base - tierDiscount;

    const saving = terms?.offer_discount_id
      ? offerSaving(
          {
            discount_id: terms.offer_discount_id,
            title: '',
            type: terms.offer_type ?? 'percentage',
            value: terms.offer_value ?? 0,
            max_discount_amount: terms.offer_max_discount_amount,
          },
          after,
        )
      : 0;

    const net = round2(after - saving);
    const taxRate = terms?.tax_rate ?? 0;
    const tax = terms?.tax_inclusive
      ? round2(net - net / (1 + taxRate / 100))
      : round2((net * taxRate) / 100);
    const total = terms?.tax_inclusive ? net : round2(net + tax);
    const current = terms?.current_total ?? total;

    return {
      total,
      /** The combined saving, which is what the floor is measured in. */
      combinedSaving: round2(tierDiscount + saving),
      /** How much less the client pays than as ordered. Zero at 0 extra. */
      clientSaves: round2(current - total),
    };
  }, [terms, isExtraValid, nextRate]);

  /**
   * A discount so deep the client owes nothing.
   *
   * The floor guard only stops reductions, so nothing server-side refuses this:
   * `respond_package_quotation` has no equivalent of `respond_quotation`'s
   * `quotation_not_priced`, and a vendor typing 90 into the extra field can
   * approve an order worth zero. That is not generosity, it is a dead end — the
   * booking card requires a positive total before it will let the client
   * schedule, so the order would be accepted and then unbookable.
   *
   * Blocked here rather than in a migration because the vendor is standing at
   * the field: telling them now is the useful moment, and a server that refused
   * afterwards would only report the same thing later.
   */
  const wouldZeroTheTotal = projection != null && projection.total <= 0;

  const canConfirm =
    pending === 'decline'
      ? reason.trim().length > 0
      : isExtraValid && !terms?.package_changed && !wouldZeroTheTotal;

  const confirm = useCallback(async () => {
    if (!quotationId || !pending || !canConfirm) return;

    setBusy(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('respond_package_quotation', {
      p_quotation_id: quotationId,
      p_action: pending,
      // Back to an absolute rate: the floor lives on the row and the trigger
      // enforces it in those terms. Only the QUESTION changed, not the contract.
      p_discount_rate: pending === 'approve' ? nextRate : null,
      p_reason: reason.trim() || null,
    });

    setBusy(false);

    if (rpcError) {
      setError(approvalError(rpcError));
      // The most likely refusal is that the package moved underneath the order,
      // and the panel is now showing terms that are no longer true. Refetch so
      // the error and the panel behind it agree.
      qc.invalidateQueries({ queryKey: ['v-package-quote-terms', quotationId] });
      return;
    }

    setPending(null);
    qc.invalidateQueries({ queryKey: ['v-quotation', quotationId] });
    qc.invalidateQueries({ queryKey: ['v-quotation-history', quotationId] });
    qc.invalidateQueries({ queryKey: ['v-package-quote-terms', quotationId] });
    qc.invalidateQueries({ queryKey: ['v-quotations'] });
    qc.invalidateQueries({ queryKey: ['v-dashboard'] });
    // Approving spends a use of the campaign, which every offer surface counts.
    qc.invalidateQueries({ queryKey: ['v-offer-performance'] });
  }, [quotationId, pending, canConfirm, nextRate, reason, qc]);

  return {
    isPackageOrder,
    isPending,
    terms,
    wouldZeroTheTotal,
    isTermsLoading,
    minRate,
    pending,
    reason,
    setReason,
    extraDiscount,
    setExtraDiscount,
    isSweetening,
    setSweetening,
    isExtraValid,
    canConfirm,
    isBusy,
    error,
    request,
    cancel,
    confirm,
    projection,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** `respond_package_quotation`'s own refusals, in plain language. */
const APPROVAL_ERRORS: Record<string, string> = {
  package_changed_since_request:
    'You have edited this package since the client ordered it, so it can no longer be approved as ' +
    'published. Decline this order and send them a fresh quote.',
  package_quote_discount_locked:
    'That would give the client a smaller saving than they ordered with. You can increase the ' +
    'discount, but not reduce it.',
  package_quote_amount_locked: 'The price on a package order cannot be changed.',
  event_date_in_past: 'The event date on this order has already passed.',
  quotation_not_answerable: 'This order has already been answered.',
  not_a_package_quote: 'This is an ordinary quote request — build and send a quote instead.',
  reason_required: 'Tell the client why, so they know what to do next.',
};

function approvalError(rpcError: { message?: string }): string {
  const message = rpcError.message ?? '';
  const known = Object.keys(APPROVAL_ERRORS).find((key) => message.includes(key));
  return known ? APPROVAL_ERRORS[known] : quotationActionError(rpcError);
}
