'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

export type ConfirmOutcome = 'confirmed' | 'already' | 'expired' | 'unknown' | 'error';

type ConfirmResponse = { outcome: ConfirmOutcome; topic?: string | null; resent?: boolean };

/**
 * Completes a double opt-in.
 *
 * ── Why the call is guarded against running twice ─────────────────────────
 * Confirmation consumes the token, and React Strict Mode runs effects twice in
 * development. Without the ref the second run would see a spent token, report
 * `unknown`, and tell somebody who just successfully subscribed that their link
 * was invalid — a bug that only appears in dev and only for the happy path,
 * which is the worst combination to debug later.
 */
export function useSubscriptionConfirm() {
  const params = useSearchParams();
  const token = params.get('t') ?? '';

  const [result, setResult] = useState<ConfirmResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setResult({ outcome: 'unknown' });
      setLoading(false);
      return;
    }

    void (async () => {
      const supa = createBrowserClient();
      if (!supa) {
        // Null when the Supabase env is missing — reported as a transport
        // failure, which is what it is from the visitor's side.
        setResult({ outcome: 'error' });
        setLoading(false);
        return;
      }
      const { data, error } = await supa.functions.invoke<ConfirmResponse>('marketing-consent', {
        body: { action: 'confirm', token },
      });
      setResult(error ? { outcome: 'error' } : (data ?? { outcome: 'error' }));
      setLoading(false);
    })();
  }, [token]);

  return { loading, result };
}
