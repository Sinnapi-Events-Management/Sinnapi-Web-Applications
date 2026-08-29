import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { packageActionError } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { quoteRequestSchema, emptyQuoteRequestValues } from '../schema';

export type QuoteRequestPackage = {
  templateId: string;
  tierId: string;
  /** Both names are for the opening line of the brief, not for the RPC. */
  packageName: string;
  tierName: string;
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
          details: `I'd like to book the ${pkg.tierName} tier of your ${pkg.packageName} package. `,
        }
      : emptyQuoteRequestValues,
  });

  const submit = handleSubmit(async ({ details }) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc('request_quotation', {
      p_vendor_id: vendorId,
      p_details: details.trim(),
      p_currency: 'UGX',
      p_template_id: pkg?.templateId ?? null,
      p_template_tier_id: pkg?.tierId ?? null,
    });
    if (rpcError) {
      // Read through the shared mapper: `package_unavailable` is a sentence a
      // client can act on, and a raw plpgsql token is not.
      setError(packageActionError(rpcError));
      return;
    }
    onSuccess();
    navigate('/quotations');
  });

  return { control, error, busy: formState.isSubmitting, submit };
}
