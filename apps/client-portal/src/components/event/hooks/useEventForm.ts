import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { eventFormSchema, emptyEventValues, toEventInsert } from '../schema';

/**
 * Posts a new client event, then sends the user to their events list.
 *
 * The session is re-read at submit time rather than trusted from render: the
 * insert is RLS-scoped to `posted_by = auth.uid()`, so a session that expired
 * while the form was open has to fail with a message the user can act on
 * instead of a raw policy violation.
 */
export function useEventForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(eventFormSchema, { defaultValues: emptyEventValues });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired.');
      return;
    }
    const { error: insertError } = await supabase
      .from('events')
      .insert(toEventInsert(values, user.id));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigate('/my-events');
  });

  return { control, error, busy: isSubmitting, submit };
}
