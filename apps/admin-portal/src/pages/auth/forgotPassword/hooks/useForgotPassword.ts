import { useState } from 'react';
import { useCaptcha } from '@sinnapi/ui/forms';
import { invokeFunction } from '@/lib/functions';

const MESSAGES: Record<string, string> = {
  'invalid:email': 'Enter a valid email address.',
  // The form fetches a fresh challenge on failure, so this reads as retryable.
  captcha_failed: "We couldn't confirm you're human. Please wait a moment and try again.",
};

const GENERIC_ERROR = "We couldn't send the reset link. Please try again.";

/**
 * Self-service password recovery for the console.
 *
 * Goes through `send-password-reset` (`action: 'self'`) rather than calling
 * `supabase.auth.resetPasswordForEmail`, which is what this used to do. That
 * call went straight from the browser to GoTrue, so nothing of ours sat in the
 * path and there was nowhere to verify a CAPTCHA — anyone could point a script
 * at this form and drive Sinnapi's mail server through an address list, burning
 * the sending domain's reputation on mail nobody asked for. It also delivered
 * GoTrue's unbranded template; the endpoint sends the same branded email as
 * every other reset, aimed at the portal the account actually belongs to.
 *
 * `sent` is set on any 200, and the endpoint answers 200 for an address with no
 * account exactly as it does for one with an account. Neither this hook nor the
 * screen it feeds can tell the difference, which is what stops a public form
 * from answering "does this person have a Sinnapi login?".
 */
export function useForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const captcha = useCaptcha();

  async function requestReset(email: string) {
    setError(null);
    if (!captcha.token) return;

    setLoading(true);
    const { error: code } = await invokeFunction('send-password-reset', {
      action: 'self',
      email: email.trim().toLowerCase(),
      captchaToken: captcha.token,
    });
    setLoading(false);

    if (code) {
      setError(MESSAGES[code] ?? GENERIC_ERROR);
      // Single-use token, spent on the refused request.
      captcha.reset();
      return;
    }
    setSent(true);
  }

  return { requestReset, error, loading, sent, captcha, canSubmit: captcha.solved && !loading };
}
