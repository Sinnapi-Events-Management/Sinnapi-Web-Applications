import { useState } from 'react';
import { useZodForm, useCaptcha } from '@sinnapi/ui/forms';
import { invokeFunction } from '@/lib/functions';
import { forgotPasswordSchema, emptyForgotPasswordValues } from '../schema';

const MESSAGES: Record<string, string> = {
  'invalid:email': 'Enter a valid email address.',
  // The form fetches a fresh challenge on failure, so this reads as retryable.
  captcha_failed: "We couldn't confirm you're human. Please wait a moment and try again.",
};

const GENERIC_ERROR = "We couldn't send the reset link. Please try again.";

/**
 * Self-service password recovery for the vendor portal.
 *
 * Goes through `send-password-reset` (`action: 'self'`) rather than calling
 * `supabase.auth.resetPasswordForEmail`: that call would go straight from the
 * browser to GoTrue, with nothing of ours in the path to verify a CAPTCHA, so
 * anyone could point a script at this form and drive Sinnapi's mail server
 * through an address list. The endpoint also sends the branded email and — the
 * part that matters here — addresses the link at the portal the account
 * actually belongs to, which for a `vendor` role is this app's
 * `/reset-password`.
 *
 * `sent` is set on any 200, and the endpoint answers 200 for an address with no
 * account exactly as it does for one with an account. Neither this hook nor the
 * screen it feeds can tell the difference, which is what stops a public form
 * from answering "does this person have a Sinnapi login?" — the same reasoning
 * behind the single `GENERIC_SIGN_IN_ERROR` on sign-in.
 */
export function useForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const captcha = useCaptcha();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(forgotPasswordSchema, { defaultValues: emptyForgotPasswordValues });

  const submit = handleSubmit(async ({ email }) => {
    setError(null);
    // Belt-and-braces: submit is disabled without a token, but a stray Enter
    // key on a slow connection should not fire a request that cannot succeed.
    if (!captcha.token) return;

    const { error: code } = await invokeFunction('send-password-reset', {
      action: 'self',
      email,
      captchaToken: captcha.token,
    });

    if (code) {
      setError(MESSAGES[code] ?? GENERIC_ERROR);
      // Single-use token, spent on the refused request.
      captcha.reset();
      return;
    }
    setSent(true);
  });

  return {
    control,
    submit,
    error,
    sent,
    loading: isSubmitting,
    captcha,
    canSubmit: captcha.solved && !isSubmitting,
  };
}
