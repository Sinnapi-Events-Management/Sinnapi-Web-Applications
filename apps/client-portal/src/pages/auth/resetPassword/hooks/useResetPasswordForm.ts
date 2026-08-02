import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { resetPasswordSchema, emptyResetPasswordValues } from '../schema';

/**
 * The write half of the reset flow: validate the new password, set it, and drop
 * the user into the portal on the recovery session they already hold.
 *
 * Split from `useResetPassword`, which owns establishing that session from the
 * link — the two fail for unrelated reasons (an expired link versus a rejected
 * password) and the screen shows them in different places.
 */
export function useResetPasswordForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(resetPasswordSchema, { defaultValues: emptyResetPasswordValues });

  const submit = handleSubmit(async ({ password }) => {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate('/dashboard', { replace: true });
  });

  return { control, error, submitting: isSubmitting, submit };
}
