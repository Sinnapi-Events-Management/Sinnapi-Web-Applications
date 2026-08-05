import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { quoteRequestSchema, emptyQuoteRequestValues } from '../schema';

/**
 * Sends a quotation request to a vendor and follows it to the quotations list,
 * where the client can track the reply.
 */
export function useQuoteRequestForm(vendorId: string, onSuccess: () => void) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(quoteRequestSchema, { defaultValues: emptyQuoteRequestValues });

  const submit = handleSubmit(async ({ details }) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc('request_quotation', {
      p_vendor_id: vendorId,
      p_details: details.trim(),
      p_currency: 'UGX',
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onSuccess();
    navigate('/quotations');
  });

  return { control, error, busy: isSubmitting, submit };
}
