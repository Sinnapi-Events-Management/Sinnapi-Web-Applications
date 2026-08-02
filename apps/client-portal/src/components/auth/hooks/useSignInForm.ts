import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { signInToPortal } from '@/auth/portalAccess';
import { safeReturnTo } from '@/auth/returnTo';
import { signInSchema, emptySignInValues } from '../schema';

/** Where to land when the sign-in link carried no `returnTo`. */
const DEFAULT_DESTINATION = '/dashboard';

/**
 * Password sign-in state machine: validates the credentials shape, submits them
 * to the portal sign-in endpoint, surfaces the failure message, and on success
 * redirects to the guarded route the user came from.
 *
 * Field-level problems ("enter a valid email") are the form's job and appear
 * under the input on blur; `error` here is only ever the server's verdict on a
 * well-formed submission, which belongs above the form because it can't be
 * attributed to a single field.
 *
 * `signInToPortal` replaces the direct `supabase.auth.signInWithPassword` this
 * used to call. The old version let anyone with any valid Sinnapi credential —
 * staff included — into the client portal, because a session was treated as
 * proof of belonging here. It also returned Supabase's own error text, which
 * distinguishes an unregistered email from a wrong password and so let the form
 * be used to enumerate accounts. The endpoint answers with one message for
 * every kind of refusal; see `GENERIC_SIGN_IN_ERROR`.
 */
export function useSignInForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(signInSchema, { defaultValues: emptySignInValues });

  const submit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const signInError = await signInToPortal(email, password);
    if (signInError) {
      setError(signInError);
      return;
    }
    navigate(safeReturnTo(params.get('returnTo'), DEFAULT_DESTINATION), { replace: true });
  });

  return { control, error, loading: isSubmitting, submit };
}
