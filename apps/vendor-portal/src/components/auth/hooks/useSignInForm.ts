import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useZodForm, useCaptcha } from '@sinnapi/ui/forms';
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
 * staff, or a client who had never applied — into the vendor portal, because a
 * session was treated as proof of belonging here. It also returned Supabase's
 * own error text, which distinguishes an unregistered email from a wrong
 * password and so let the form be used to enumerate accounts. The endpoint
 * answers with one message for every kind of refusal; see
 * `GENERIC_SIGN_IN_ERROR`.
 *
 * A Cloudflare Turnstile token rides along with every attempt, and the endpoint
 * redeems it before the password is checked — without it, the per-address
 * lockout is the only thing between this form and a credential-stuffing run,
 * and a per-address lockout does nothing about a list of ten thousand
 * addresses tried once each.
 */
export function useSignInForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const captcha = useCaptcha();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(signInSchema, { defaultValues: emptySignInValues });

  const submit = handleSubmit(async ({ email, password }) => {
    setError(null);
    // Belt-and-braces: submit is disabled without a token, but a stray Enter
    // key on a slow connection should not fire a request that cannot succeed.
    if (!captcha.token) return;

    const signInError = await signInToPortal(email, password, captcha.token);
    if (signInError) {
      setError(signInError);
      // Turnstile tokens are single-use and this one has just been spent on a
      // refused attempt. The form stays on screen, so without a fresh challenge
      // the next submit would be rejected for a replayed token rather than for
      // whatever the user retyped.
      captcha.reset();
      return;
    }
    navigate(safeReturnTo(params.get('returnTo'), DEFAULT_DESTINATION), { replace: true });
  });

  return {
    control,
    error,
    loading: isSubmitting,
    submit,
    captcha,
    canSubmit: captcha.solved && !isSubmitting,
  };
}
