'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import type { TopicKey } from '../data/topics';

export type TopicState = { topic: TopicKey; subscribed: boolean; known: boolean };

type PreferencesResponse =
  | { found: false }
  | { found: true; email: string; suppressed: boolean; topics: TopicState[] };

/**
 * The preference centre's state.
 *
 * ── Why every call goes through an Edge Function ──────────────────────────
 * The token in the link is a capability, and the tables behind it expose no
 * anonymous policy at all — a visitor's anon key cannot read or write
 * `marketing_subscriptions` directly. The function resolves the token on the
 * service role, records the IP and user agent against the change as GDPR
 * evidence, and returns only a masked address. None of that can happen from a
 * browser holding an anon key, which is the point.
 *
 * ── Why a missing token is not an error screen ────────────────────────────
 * `found: false` is by far the most likely failure here, and it almost always
 * means somebody clicked a link in a very old email. That deserves a sentence
 * and a support address, not a 404 — the person is trying to unsubscribe, and
 * a dead end is precisely how an unsubscribe becomes a spam report.
 */
export function useEmailPreferences() {
  const params = useSearchParams();
  const token = params.get('t') ?? '';

  const [state, setState] = useState<PreferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justUnsubscribedAll, setJustUnsubscribedAll] = useState(false);

  const call = useCallback(
    async (body: Record<string, unknown>): Promise<PreferencesResponse | null> => {
      const supa = createBrowserClient();
      // `createAnonClient` returns null when the Supabase env is missing. A
      // preference centre that cannot reach the server must say so rather than
      // silently appear to work — this is the one page where a no-op looks
      // exactly like a successful unsubscribe.
      if (!supa) {
        setError('We could not reach our servers. Please try again shortly.');
        return null;
      }
      const { data, error: e } = await supa.functions.invoke<PreferencesResponse>(
        'marketing-consent',
        { body: { token, ...body } },
      );
      if (e) {
        setError('Something went wrong. Please try again.');
        return null;
      }
      setError(null);
      return data ?? null;
    },
    [token],
  );

  useEffect(() => {
    if (!token) {
      setState({ found: false });
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = await call({ action: 'preferences' });
      if (!cancelled) {
        setState(next ?? { found: false });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, call]);

  const setTopic = useCallback(
    async (topic: TopicKey, subscribed: boolean) => {
      setBusy(topic);
      const next = await call({ action: 'set', topic, subscribed });
      if (next) setState(next);
      setJustUnsubscribedAll(false);
      setBusy(null);
    },
    [call],
  );

  const unsubscribeAll = useCallback(async () => {
    setBusy('all');
    const next = await call({ action: 'unsubscribe' });
    if (next) {
      setState(next);
      setJustUnsubscribedAll(true);
    }
    setBusy(null);
  }, [call]);

  return { state, loading, busy, error, justUnsubscribedAll, setTopic, unsubscribeAll };
}
