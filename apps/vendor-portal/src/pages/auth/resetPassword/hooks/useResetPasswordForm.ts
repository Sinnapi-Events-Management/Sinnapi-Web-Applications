import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { resetPasswordSchema, emptyResetPasswordValues } from '../schema';

/**
 * The write half of the reset flow: validate the new password, set it, and drop
 * the vendor into the portal on the recovery session they already hold.
 *
 * `must_change_password` is cleared alongside the password because a vendor
 * arriving here may still be carrying the one-time-password flag from
 * `promote-intake` — they have now chosen their own, which is exactly what that
 * flag is waiting for. Leaving it set would bounce them straight back to
 * `/change-password` to do the same thing twice.
 *
 * Split from `useResetPassword`, which owns establishing the session from the
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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate('/dashboard', { replace: true });
  });

  return { control, error, submitting: isSubmitting, submit };
}
