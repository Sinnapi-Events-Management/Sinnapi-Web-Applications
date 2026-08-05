'use client';
import { useCallback, useRef, useState } from 'react';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

/**
 * Where the challenge is in its lifecycle.
 *
 * `pending` covers both "the script is still loading" and "Cloudflare is
 * deciding", because the form treats them identically: no token yet, so no
 * submit. `expired` is separated from `error` only so the copy can say the
 * useful thing — a token that timed out is not a failure the visitor caused.
 */
export type CaptchaStatus = 'pending' | 'solved' | 'error' | 'expired';

/** The slice of state `CaptchaField` needs. Spread it onto the component. */
export type CaptchaFieldBinding = {
  instanceRef: React.MutableRefObject<TurnstileInstance | undefined>;
  status: CaptchaStatus;
  onSuccess: (token: string) => void;
  onError: () => void;
  onExpire: () => void;
};

export type Captcha = {
  /** The `cf-turnstile-response` to send to the server, or null while unsolved. */
  token: string | null;
  /** Submit-gate: true once a token exists. */
  solved: boolean;
  status: CaptchaStatus;
  /** Discard the current token and ask Cloudflare for a fresh challenge. */
  reset: () => void;
  fieldProps: CaptchaFieldBinding;
};

/**
 * Turnstile token state for one form.
 *
 * All the state lives here and none of it in the form components, which is why
 * every protected form in the four apps looks the same: call `useCaptcha`,
 * render `<CaptchaField {...captcha.fieldProps} />`, gate submit on
 * `captcha.solved`, and pass `captcha.token` to the server.
 *
 * THE ONE RULE CALLERS MUST NOT FORGET: tokens are single-use. Cloudflare's
 * edge redeems a token at the first siteverify call and answers
 * `timeout-or-duplicate` for every attempt after that. Our forms stay on the
 * page when the server refuses (a wrong password re-renders the same form), so
 * a second submit would carry an already-spent token and be rejected for a
 * reason that has nothing to do with what the visitor typed. Every submit path
 * therefore calls `reset()` on failure — see the hooks in each app.
 */
export function useCaptcha(): Captcha {
  const instanceRef = useRef<TurnstileInstance | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<CaptchaStatus>('pending');

  const reset = useCallback(() => {
    setToken(null);
    setStatus('pending');
    instanceRef.current?.reset();
  }, []);

  const onSuccess = useCallback((next: string) => {
    setToken(next);
    setStatus('solved');
  }, []);

  // Both failure paths drop the token as well as the status: leaving a stale
  // token behind would let a form submit a credential Cloudflare has already
  // stopped vouching for.
  const onError = useCallback(() => {
    setToken(null);
    setStatus('error');
  }, []);

  const onExpire = useCallback(() => {
    setToken(null);
    setStatus('expired');
  }, []);

  return {
    token,
    solved: token !== null,
    status,
    reset,
    fieldProps: { instanceRef, status, onSuccess, onError, onExpire },
  };
}
