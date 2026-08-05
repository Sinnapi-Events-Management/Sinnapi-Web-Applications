import { useCallback, useEffect, useState } from 'react';
import { useCaptcha } from '@sinnapi/ui/forms';
import { resendConfirmation, RESEND_COOLDOWN_SECONDS } from '@/auth/signUpApi';

/**
 * Resend-with-cooldown state for the confirmation screen.
 *
 * The countdown starts already running: by the time this mounts a confirmation
 * email has just gone out, so the server's cooldown is ticking whether or not
 * the button pretends otherwise. Starting at zero would offer an action that is
 * guaranteed to be refused.
 *
 * The countdown is a mirror of the server's limit, never the limit itself —
 * `signup_throttle_active` is what actually enforces it. This exists so the
 * button explains the wait instead of failing into an error message.
 *
 * This screen carries its own Turnstile challenge rather than reusing the
 * registration form's: that widget unmounted when the form was replaced, and
 * its token was spent on the signup that got the visitor here. Resend needs
 * protecting in its own right — it mails an address on demand, which is the
 * cheapest thing on the whole auth surface for a bot to abuse.
 */
export function useResendConfirmation(email: string) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captcha = useCaptcha();

  // A chain of one-second timeouts rather than an interval: each tick is its own
  // effect run, so React's cleanup cancels exactly the pending tick on unmount
  // and there is no interval to leak.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  const resend = useCallback(async () => {
    if (secondsLeft > 0 || sending || !captcha.token) return;
    setSending(true);
    setError(null);
    setNotice(null);

    const result = await resendConfirmation(email, captcha.token);
    setSending(false);
    // Spent either way — this button is pressed repeatedly by design, so the
    // next press needs its own challenge whichever way this one went.
    captcha.reset();

    if (!result.ok) {
      setError(result.error);
      // Refused for rate-limiting, so restart the wait rather than leaving an
      // enabled button that will only be refused again.
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      return;
    }

    // Deliberately not "we sent another email": the endpoint answers the same
    // way for an address with no account, so claiming delivery would be a
    // guess. This phrasing is true either way.
    setNotice('If that address needs confirming, a new link is on its way.');
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  }, [email, secondsLeft, sending, captcha]);

  return {
    secondsLeft,
    sending,
    notice,
    error,
    resend,
    captcha,
    canResend: captcha.solved && secondsLeft === 0 && !sending,
  };
}
