import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { packageActionError } from '@sinnapi/ui';
import { offerBlockCopy } from '@sinnapi/ui/offers';
import { supabase } from '@/lib/supabase';
import { quoteRequestSchema, emptyQuoteRequestValues } from '../schema';

export type QuoteRequestPackage = {
  templateId: string;
  tierId: string;
  /** Both names are for the opening line of the brief, not for the RPC. */
  packageName: string;
  tierName: string;
  /**
   * The offer the client was looking at when they clicked.
   *
   * The CODE, not the amount — `request_quotation` resolves it to a discount
   * row and re-validates it, and `send_quotation` recomputes the saving from
   * that row when the vendor prices the quote. A client stating a saving is a
   * client stating a price, and this one flows into escrow.
   *
   * Null for an automatic offer, which needs no code: the server finds it
   * itself through `best_automatic_discount` when the vendor sends.
   */
  offerCode?: string | null;
  /** What the card advertised, for the confirmation line only. Never sent. */
  offerLabel?: string | null;
};

/**
 * Sends a quotation request to a vendor and follows it to the quotations list,
 * where the client can track the reply.
 *
 * WHEN THE REQUEST IS ABOUT A PACKAGE
 * The package and tier travel to the server, which checks the client could
 * actually have seen them — a request naming a private package would show the
 * vendor someone asking for something not on offer, and would leak that a draft
 * exists. On the vendor's side the builder then opens on that tier, already
 * priced, which is the whole reason a client is allowed to name one.
 *
 * The brief is pre-filled with what the client has already said by clicking,
 * rather than left blank. The minimum length exists so a vendor gets something
 * to price against; a client who has just picked a specific tier has given them
 * that, and asking them to type it out again is asking twice.
 *
 * THE DISCOUNT CODE
 * Seeded from the offer the client was looking at, and editable — a client who
 * arrived with a code from a flyer must be able to type it, and a client who
 * clicked through from a card should not have to. Either way the string is all
 * that is sent: the server resolves it, validates it against this vendor, this
 * package and this tier, and refuses with a reason the field can render.
 *
 * A refusal on the code is attached to the code field rather than the form, so
 * a client whose code has expired can clear it and send the request anyway
 * instead of losing a brief they have just written.
 */
export function useQuoteRequestForm(
  vendorId: string,
  onSuccess: () => void,
  pkg?: QuoteRequestPackage,
) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useZodForm(quoteRequestSchema, {
    defaultValues: pkg
      ? {
          ...emptyQuoteRequestValues,
          details: `I'd like to book the ${pkg.tierName} tier of your ${pkg.packageName} package. `,
          discountCode: pkg.offerCode ?? '',
        }
      : emptyQuoteRequestValues,
  });

  const [codeError, setCodeError] = useState<string | null>(null);

  const submit = handleSubmit(async ({ details, discountCode, eventAddress }) => {
    setError(null);
    setCodeError(null);

    const code = discountCode?.trim() ?? '';

    const { error: rpcError } = await supabase.rpc('request_quotation', {
      p_vendor_id: vendorId,
      p_details: details.trim(),
      p_event_address: eventAddress.trim(),
      p_currency: 'UGX',
      p_template_id: pkg?.templateId ?? null,
      p_template_tier_id: pkg?.tierId ?? null,
      p_discount_code: code || null,
    });
    if (rpcError) {
      // A refused code lands on the code field, so a client can clear it and
      // send the brief they have already written. Everything else is about the
      // request as a whole and belongs above the form.
      const message = rpcError.message ?? '';
      if (message.includes('discount_unavailable') || message.includes('discount_not_found')) {
        setCodeError(offerRequestError(message));
        return;
      }
      // The address rules are enforced server-side too, so a client who somehow
      // gets past the form still gets a sentence rather than a plpgsql token.
      if (message.includes('event_address_required')) {
        setError('Tell them where the event is.');
        return;
      }
      if (message.includes('event_address_too_long')) {
        setError('Please keep the address under 160 characters.');
        return;
      }
      // Read through the shared mapper: `package_unavailable` is a sentence a
      // client can act on, and a raw plpgsql token is not.
      setError(packageActionError(rpcError));
      return;
    }
    onSuccess();
    navigate('/quotations');
  });

  return {
    control,
    error,
    codeError,
    busy: formState.isSubmitting,
    submit,
    offerLabel: pkg?.offerLabel ?? null,
  };
}

/**
 * `discount_unavailable: wrong_tier` → the sentence for that reason.
 *
 * The RPC raises rather than returning a row, so the reason arrives inside a
 * Postgres error message. Parsed here rather than in the component because the
 * mapping from reason to sentence already exists in `offerBlockCopy` and must
 * not be written twice — a client typing a code into this form and a client
 * typing the same code into the checkout have to be told the same thing.
 */
function offerRequestError(message: string): string {
  if (message.includes('discount_not_found')) return offerBlockCopy('not_found');
  const reason = message.split('discount_unavailable:')[1]?.trim().split(/\s/)[0];
  return offerBlockCopy(reason);
}
