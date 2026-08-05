import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCaptcha } from '@sinnapi/ui/forms';
import { signInToPortal } from '@/auth/portalAccess';
import { safeReturnTo } from '@/auth/returnTo';

/**
 * Console sign-in state machine.
 *
 * Extracted from `SignInForm` so the component is structure only, matching the
 * client and vendor portals. It reads the two fields off the submitted
 * `FormData` rather than holding them in state: the console has no zod schema
 * for this form (there is nothing to validate beyond "not empty", which the
 * inputs' own `required` covers), and controlled state for two fields that are
 * read once would be ceremony.
 *
 * Submits to the `portal-sign-in` endpoint rather than calling
 * `supabase.auth.signInWithPassword` directly — see `signInToPortal` for why —
 * and carries a Cloudflare Turnstile token, which that endpoint redeems before
 * the password is examined. This is the front door to the console, so it is the
 * single most valuable form on the platform to point a credential-stuffing run
 * at, and the per-address lockout behind it does nothing about a run that tries
 * ten thousand addresses once each.
 */
export function useSignInForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const captcha = useCaptcha();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    // Belt-and-braces: submit is disabled without a token, but a stray Enter
    // key on a slow connection should not fire a request that cannot succeed.
    if (!captcha.token) return;

    const form = new FormData(e.currentTarget);
    setLoading(true);
    const signInError = await signInToPortal(
      String(form.get('email') ?? '')
        .trim()
        .toLowerCase(),
      String(form.get('password') ?? ''),
      captcha.token,
    );
    setLoading(false);

    if (signInError) {
      setError(signInError);
      // Single-use token, spent on the refused attempt. Without a fresh
      // challenge the next submit is rejected as a replay rather than on its
      // own merits.
      captcha.reset();
      return;
    }
    navigate(safeReturnTo(params.get('returnTo'), '/dashboard'), { replace: true });
  }

  return { error, loading, submit, captcha, canSubmit: captcha.solved && !loading };
}
