'use client';
import { useMemo, useRef, useState } from 'react';
import { useCaptcha } from '@sinnapi/ui/forms';
import { createBrowserClient } from '@/lib/supabase/browser';
import type { RegistrationValues } from '../data/schema';
import type { FailureReason } from '../data/options';
import { toApplicationPayload } from '../utils/toApplicationPayload';

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

/** Sends a validated application: the Turnstile challenge, the request and its outcome. */
export function useRegistrationSubmit() {
  const supa = useMemo(() => createBrowserClient(), []);
  // One per page view. The server answers a repeated ref with the row it
  // already has, so a double submit files one application, not two.
  const submissionRef = useRef<string>(uid());
  const captcha = useCaptcha();

  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [failure, setFailure] = useState<FailureReason>('generic');
  const [submitted, setSubmitted] = useState(false);

  function fail(reason: FailureReason) {
    setFailure(reason);
    setStatus('error');
  }

  async function send(values: RegistrationValues) {
    if (!supa) return fail('generic');
    if (!captcha.token) return fail('captcha');

    setStatus('submitting');
    const { error } = await supa.functions.invoke('vendor-application', {
      body: toApplicationPayload(values, captcha.token, submissionRef.current),
    });
    if (error) {
      // 403 is the endpoint refusing the Turnstile token. 409 is the duplicate
      // guard: this email is already an approved vendor, so there is nothing to
      // retry and the copy has to say so rather than invite another submit.
      // Everything else is a validation or transport failure — generic copy.
      const httpStatus = (error as { context?: Response }).context?.status;
      if (httpStatus === 403) fail('captcha');
      else if (httpStatus === 409) fail('alreadyApplied');
      else fail('generic');
      // Spent on the refused submission either way — the form is still on
      // screen, so the retry needs its own challenge.
      captcha.reset();
      return;
    }
    setStatus('idle');
    setSubmitted(true);
  }

  return {
    captcha,
    submitting: status === 'submitting',
    submitFailed: status === 'error',
    failure,
    submitted,
    send,
  };
}
