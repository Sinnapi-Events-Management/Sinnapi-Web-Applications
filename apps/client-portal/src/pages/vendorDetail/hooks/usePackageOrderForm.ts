import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { localToday, packageActionError, packageTierPricing } from '@sinnapi/ui';
import { useZodForm } from '@sinnapi/ui/forms';
import { offerBlockCopy, offerSaving } from '@sinnapi/ui/offers';
import { supabase } from '@/lib/supabase';
import { useEventTypeOptions } from '@/hooks/queries';
import {
  emptyPackageOrderValues,
  packageOrderDateBounds,
  packageOrderSchema,
  toPackageOrderArgs,
} from '../schema';
import type { PackageRequest } from './useVendorPackages';

/**
 * Ordering a published tier at its published price.
 *
 * WHAT MAKES THIS DIFFERENT FROM `useQuoteRequestForm`
 * That hook sends a brief. This one places an order. `request_package_quotation`
 * writes a fully priced quotation whose approval is the vendor's, so everything
 * here is shaped by one fact: the client is committing to a number, and they
 * have to be able to see the number they are committing to.
 *
 * Which is why the breakdown below is computed at all. It is display arithmetic
 * and nothing it produces is ever sent — `offerPricing.ts` says so in its own
 * header — but a form that asks someone to commit to a price without showing it
 * is a form that hides the only thing that matters on it.
 *
 * THE DATE IS THE INTERESTING FIELD
 * On an undiscounted package it is just "when is your event". On a discounted
 * one it decides whether the discount applies at all: the offer's window is the
 * range the event must fall in, and the server refuses anything outside it. So
 * the picker is bounded rather than validated — a calendar that will not let
 * you pick a bad day beats one that takes the day and then argues.
 *
 * The bound is derived from the offer the client is looking at, which is the
 * same offer that travels to the server. If it is stale the server refuses and
 * `offerBlockCopy` names the real window; the bounds are the fast path, never
 * the authority.
 */
export function usePackageOrderForm(request: PackageRequest, onSuccess: () => void) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const eventTypes = useEventTypeOptions();
  const today = localToday();

  const { pkg, tierId, tierName, offer } = request;

  const bounds = useMemo(() => packageOrderDateBounds(offer, today), [offer, today]);

  /**
   * What the client is agreeing to pay, itemised.
   *
   * Recomputed here rather than passed down from the card, because the card
   * priced the tier the reader had open and the dialog is about the tier they
   * clicked — normally the same tier, and "normally" is not a basis for a
   * number someone is about to be bound to.
   */
  const pricing = useMemo(() => {
    const tier = (pkg.quote_template_tiers ?? []).find((entry) => entry.id === tierId) ?? null;
    const tierPricing = packageTierPricing(pkg, tier);
    const saving = offerSaving(offer, tierPricing.net);
    const net = tierPricing.net - saving;
    const tax = tierPricing.taxInclusive
      ? Math.round((net - net / (1 + tierPricing.taxRate / 100)) * 100) / 100
      : Math.round(((net * tierPricing.taxRate) / 100) * 100) / 100;

    return {
      ...tierPricing,
      offerSaving: saving,
      // The offer lands on the tier's net and tax is recomputed on the reduced
      // figure — the rule `price_package_tier` follows in SQL, and the reason
      // the total here matches the total the quotation comes back with.
      offeredTax: tax,
      offeredTotal: tierPricing.taxInclusive ? net : Math.round((net + tax) * 100) / 100,
    };
  }, [pkg, tierId, offer]);

  const { control, handleSubmit, formState } = useZodForm(packageOrderSchema, {
    defaultValues: {
      ...emptyPackageOrderValues,
      // The brief opens on what the client has already said by clicking, which
      // is how `useQuoteRequestForm` has always seeded it. Dropping this when
      // the order flow replaced the request form made every client start at an
      // empty box under a 20-character minimum — so the first thing the form
      // did was ask them to retype the choice they had just made.
      details: `I'd like to book the ${tierName} tier of your ${pkg.name} package. `,
      // Seeded from the offer the client clicked, and editable — the same
      // bargain `useQuoteRequestForm` strikes: a client who arrived with a code
      // off a flyer needs somewhere to type it, and one who clicked a card
      // should not have to.
      discountCode: offer?.code ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    setCodeError(null);

    const { data, error: rpcError } = await supabase.rpc(
      'request_package_quotation',
      toPackageOrderArgs(values, pkg.vendor_id ?? '', pkg.id, tierId),
    );

    if (rpcError) {
      const message = rpcError.message ?? '';
      // A refusal about the DATE belongs on the date field, and a refusal about
      // the CODE belongs on the code field. Both are recoverable without losing
      // the brief; putting either above the form would make the client re-read
      // everything to find the one box that is wrong.
      if (message.includes('offer_date_unavailable')) {
        setError(offerBlockCopy(dateReason(message), { window: bounds.window ?? undefined }));
        return;
      }
      if (message.includes('discount_unavailable') || message.includes('discount_not_found')) {
        setCodeError(offerCodeError(message));
        return;
      }
      setError(orderError(rpcError));
      return;
    }

    // The new quotation shows up in the list and in the dashboard's counts, and
    // the offer it just reserved is no longer available to anyone else — so the
    // packages behind this dialog are stale the moment it closes.
    qc.invalidateQueries({ queryKey: ['quotations'] });
    qc.invalidateQueries({ queryKey: ['dashboard-counts'] });
    qc.invalidateQueries({ queryKey: ['vendor-package-offers'] });

    onSuccess();
    const id = typeof data === 'string' ? data : null;
    navigate(id ? `/quotations/${id}` : '/quotations');
  });

  return {
    control,
    error,
    codeError,
    busy: formState.isSubmitting,
    submit,
    pricing,
    offer,
    tierName,
    packageName: pkg.name,
    eventTypeOptions: useMemo(
      () => (eventTypes.data ?? []).map((t) => ({ value: t.id, label: t.name })),
      [eventTypes.data],
    ),
    isEventTypesLoading: eventTypes.isLoading,
    ...bounds,
  };
}

/** `offer_date_unavailable: event_after_window (…)` → the reason token. */
function dateReason(message: string): string {
  return message.split('offer_date_unavailable:')[1]?.trim().split(/\s/)[0] ?? 'event_after_window';
}

/** `discount_unavailable: wrong_tier` → the sentence for that reason. */
function offerCodeError(message: string): string {
  if (message.includes('discount_not_found')) return offerBlockCopy('not_found');
  const reason = message.split('discount_unavailable:')[1]?.trim().split(/\s/)[0];
  return offerBlockCopy(reason);
}

/**
 * The refusals that are about the ORDER rather than about an offer.
 *
 * `packageActionError` already turns `package_unavailable` into a sentence, so
 * the only ones added here are the states this flow invented — a package edited
 * out from under a client mid-order, and the two the form should have caught.
 */
const ORDER_ERRORS: Record<string, string> = {
  event_date_in_past: 'Pick a date in the future.',
  event_date_required: 'Choose the date of your event.',
  event_type_required: 'Tell them what kind of event this is.',
  details_required: 'Give them at least a sentence about your event.',
  details_too_long: 'Please keep the description under 2000 characters.',
  event_address_required: 'Tell them where the event is.',
  event_address_too_long: 'Please keep the address under 160 characters.',
  tier_not_in_package:
    'That tier is no longer part of this package. Reopen the package and pick again.',
};

function orderError(rpcError: { message?: string }): string {
  const message = rpcError.message ?? '';
  const known = Object.keys(ORDER_ERRORS).find((key) => message.includes(key));
  return known ? ORDER_ERRORS[known] : packageActionError(rpcError);
}
