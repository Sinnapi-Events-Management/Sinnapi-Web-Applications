import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { RESET_LINK_STALE_MESSAGE, updateOwnPassword } from '@sinnapi/utils/passwordWrite';
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
    // Ticketed write — see `updateOwnPassword`. The reset link's own sign-in
    // is what authorises it, for an hour.
    const failure = await updateOwnPassword(supabase, { password }, RESET_LINK_STALE_MESSAGE);
    if (failure) {
      setError(failure);
      return;
    }
    navigate('/dashboard', { replace: true });
  });

  return { control, error, submitting: isSubmitting, submit };
}
