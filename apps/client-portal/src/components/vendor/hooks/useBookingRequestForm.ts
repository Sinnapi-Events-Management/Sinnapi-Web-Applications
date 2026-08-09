import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatch } from 'react-hook-form';
import { fromMinutes, toMinutes } from '@sinnapi/ui';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { bookingRequestSchema, emptyBookingRequestValues, toBookingRequestArgs } from '../schema';

/** The granularity of the time pickers, and so the shortest bookable window. */
const SLOT_MINUTES = 15;

/**
 * Sends a booking request to a vendor and follows it to the bookings list,
 * where the client can track the vendor's response.
 *
 * The end time's floor is derived here rather than left to validation: an end
 * that cannot be earlier than its start is better than one that can be, and
 * then complains. It sits one slot above the start, because a zero-length
 * booking is not a booking.
 */
export function useBookingRequestForm(vendorId: string, onSuccess: () => void) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(bookingRequestSchema, { defaultValues: emptyBookingRequestValues });

  const startTime = useWatch({ control, name: 'start_time' });
  const startMinutes = toMinutes(startTime);
  const endMinTime = startMinutes === null ? undefined : fromMinutes(startMinutes + SLOT_MINUTES);

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

  return {
    control,
    error,
    busy: isSubmitting,
    submit,
    slotMinutes: SLOT_MINUTES,
    endMinTime,
    /** An end time means nothing until a start exists to measure it from. */
    endDisabled: startMinutes === null,
  };
}
