import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { safeReturnTo } from '@/auth/returnTo';
import { changePasswordSchema, emptyChangePasswordValues } from '../schema';

/** Where to land when nothing was being reached for in the first place. */
const DEFAULT_DESTINATION = '/dashboard';

/**
 * Drives the forced first-sign-in password change for vendors whose account was
 * provisioned server-side with a one-time password (`promote-intake`, when an
 * application is approved). The user is already authenticated, so there's no
 * recovery code to exchange — we set the new password and clear the one-time
 * `must_change_password` flag in a single write. That flag is what
 * `ProtectedRoute` gates on, so the resulting USER_UPDATED event releases them
 * into the portal.
 *
 * Releases them onto `?returnTo` rather than always the dashboard:
 * `ProtectedRoute` puts the refused route on this screen's URL, so a vendor who
 * arrived from a notification email on their one-time password still lands on
 * what the mail was about once the password is their own.
 */
export function useChangePassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(changePasswordSchema, { defaultValues: emptyChangePasswordValues });

  useEffect(() => {
    if (passwordChanged && !session?.user.user_metadata?.must_change_password) {
      navigate(safeReturnTo(params.get('returnTo'), DEFAULT_DESTINATION), { replace: true });
    }
  }, [navigate, params, passwordChanged, session]);

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
    setPasswordChanged(true);
  });

  return { control, error, submitting: isSubmitting, submit };
}
