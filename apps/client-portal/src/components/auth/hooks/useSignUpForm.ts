import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useZodForm, useCaptcha } from '@sinnapi/ui/forms';
import { signUpClient } from '@/auth/signUpApi';
import { signUpSchema, emptySignUpValues, toSignUpRole } from '../schema';

/**
 * Account creation state machine.
 *
 * There is now exactly one success shape. Registration used to have two — an
 * immediate session when confirmation was off, or "check your email" when it
 * wasn't — and the branch that navigated straight to the dashboard was the one
 * letting unverified addresses (and bots) into the portal. Every signup now ends
 * on the confirmation screen, and the account stays `pending` until the link is
 * clicked, so the caller cannot get a session out of this form at all.
 *
 * The role select is seeded from `?role=` — narrowed through `toSignUpRole` so
 * a hand-edited query string can't seed the form with a role the schema will
 * then reject on submit. (The server narrows it again; this is convenience, not
 * the control.)
 *
 * The Cloudflare Turnstile token is the piece that makes registration expensive
 * for a bot. `pending` accounts hold nothing, so a scripted signup run never
 * gets into the portal — but it does mint auth users and fire a confirmation
 * email at every address it invents, which is Sinnapi's mail reputation being
 * spent by somebody else.
 */
export function useSignUpForm() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  /** The address we sent to — non-null once submitted, and what the confirmation screen shows. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const captcha = useCaptcha();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useZodForm(signUpSchema, {
    defaultValues: emptySignUpValues(toSignUpRole(params.get('role'))),
  });

  const submit = handleSubmit(async ({ fullName, email, password, role }) => {
    setError(null);
    if (!captcha.token) return;

    const result = await signUpClient({
      fullName,
      email,
      password,
      role,
      captchaToken: captcha.token,
    });
    if (!result.ok) {
      setError(result.error);
      // Single-use token, already redeemed by the failed attempt — the form is
      // still on screen and the next submit needs a fresh one.
      captcha.reset();
      return;
    }
    setSentTo(result.email);
  });

  /**
   * Back to an empty form after a mistyped address. The password is cleared
   * along with everything else — re-entering it is a small cost against leaving
   * a filled password field sitting in a form the user has walked away from.
   */
  const startOver = () => {
    setSentTo(null);
    setError(null);
    reset(emptySignUpValues(toSignUpRole(params.get('role'))));
    // The widget unmounted with the form, so the token it produced is stale
    // whether or not it was ever spent.
    captcha.reset();
  };

  return {
    control,
    error,
    loading: isSubmitting,
    sentTo,
    submit,
    startOver,
    captcha,
    canSubmit: captcha.solved && !isSubmitting,
  };
}
