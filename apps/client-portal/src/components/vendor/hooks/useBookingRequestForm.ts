import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { bookingRequestSchema, emptyBookingRequestValues, toBookingRequestArgs } from '../schema';

/**
 * Sends a booking request to a vendor and follows it to the bookings list,
 * where the client can track the vendor's response.
 */
export function useBookingRequestForm(vendorId: string, onSuccess: () => void) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(bookingRequestSchema, { defaultValues: emptyBookingRequestValues });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      'create_booking',
      toBookingRequestArgs(values, vendorId),
    );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onSuccess();
    navigate('/bookings');
  });

  return { control, error, busy: isSubmitting, submit };
}
