import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { changePasswordSchema, emptyChangePasswordValues } from '../schema';

/**
 * Drives the forced first-sign-in password change for vendors whose account was
 * provisioned server-side with a one-time password (`promote-intake`, when an
 * application is approved). The user is already authenticated, so there's no
 * recovery code to exchange — we set the new password and clear the one-time
 * `must_change_password` flag in a single write. That flag is what
 * `ProtectedRoute` gates on, so the resulting USER_UPDATED event releases them
 * into the portal.
 */
export function useChangePassword() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(changePasswordSchema, { defaultValues: emptyChangePasswordValues });

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
