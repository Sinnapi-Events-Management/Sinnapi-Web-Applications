import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  checkPortalAccess,
  logSignOut,
  signOutReasonFor,
  touchPortalSession,
  type SignOutReason,
} from './portalAccess';

type AuthState = {
  session: Session | null;
  user: User | null;
  /** Role keys the account holds, straight from the portal gate. */
  roles: string[];
  loading: boolean;
  /**
   * True while a stored session is waiting for the gate because the server
   * could not be reached (weak signal, airplane mode). The session is neither
   * shown nor revoked — the provider keeps retrying — so `ProtectedRoute` can
   * say "no connection" instead of bouncing the person to the sign-in form.
   */
  offline: boolean;
  /** Ask the gate again now, e.g. from a "Try again" button. */
  retry: () => void;
  /** `reason` is recorded in the audit trail; defaults to a deliberate exit. */
  signOut: (reason?: SignOutReason) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Holds the session — but only a session this portal has agreed to.
 *
 * A Supabase session is project-wide, not app-wide: every Sinnapi portal shares
 * one auth backend, so "there is a session" says nothing about whether its
 * owner belongs in the vendor portal. `portal-sign-in` settles that for the
 * normal login path, but sessions also arrive by routes that never touch it —
 * one restored from localStorage, an email-confirmation or password-recovery
 * redirect, a token refresh minted after someone's roles changed. Each of those
 * is re-checked here, so the gate holds however the session showed up.
 *
 * `session` is therefore never exposed until it has been admitted, and a
 * refused one is signed out rather than merely hidden.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  // Verdicts are async, so a slow answer about a session that has since been
  // replaced must not overwrite a newer one. Each check takes a ticket and
  // discards itself if it is no longer the latest.
  const ticketRef = useRef(0);
  // Whether an admitted session is currently held — decides how to treat a
  // check that could not reach the server (see below).
  const admittedRef = useRef(false);
  // The session waiting on an unreachable gate, and the retry schedule for it.
  const pendingRef = useRef<Session | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const admitRef = useRef<(next: Session | null) => Promise<void>>(async () => {});

  const retry = useCallback(() => {
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    if (pendingRef.current) void admitRef.current(pendingRef.current);
  }, []);

  useEffect(() => {
    let mounted = true;

    const clearRetry = () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
      pendingRef.current = null;
      attemptsRef.current = 0;
    };

    async function admit(next: Session | null) {
      const ticket = ++ticketRef.current;

      if (!next) {
        if (!mounted) return;
        clearRetry();
        admittedRef.current = false;
        setOffline(false);
        setSession(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      const { verdict, roles: roleKeys, denyReason } = await checkPortalAccess();
      if (!mounted || ticket !== ticketRef.current) return;

      if (verdict === 'allowed') {
        clearRetry();
        admittedRef.current = true;
        setOffline(false);
        setSession(next);
        setRoles(roleKeys);
        setLoading(false);
        // Keeps this device on the "Where you're signed in" list. Runs on every
        // admission (sign-in, app open, hourly refresh) — one cheap upsert.
        void touchPortalSession();
        return;
      }

      // `unknown` is "we could not ask", not "no". For a session already
      // admitted — a background token refresh, say — keeping it is right: one
      // flaky request should not throw a working user out of the app.
      if (verdict === 'unknown' && admittedRef.current) {
        setSession(next);
        setLoading(false);
        return;
      }

      // A session never vetted on this load, and the server unreachable — the
      // ordinary state of opening the app on a weak mobile connection. It used
      // to be revoked here, which signed people out of every device whenever
      // the network blinked at startup. It is now held back instead: NOT
      // published (nothing renders until the gate answers) and NOT revoked,
      // and asked about again with backoff and whenever the browser reports it
      // is back online.
      if (verdict === 'unknown') {
        pendingRef.current = next;
        setOffline(true);
        setLoading(true);
        const delay = Math.min(2000 * 2 ** attemptsRef.current, 30_000);
        attemptsRef.current += 1;
        if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null;
          if (pendingRef.current) void admit(pendingRef.current);
        }, delay);
        return;
      }

      clearRetry();
      admittedRef.current = false;
      setOffline(false);
      setSession(null);
      setRoles([]);
      setLoading(false);
      // Refused sessions are revoked, not just hidden: leaving a live token in
      // storage would let the next tab pick it straight back up. Logged first,
      // labelled by why (refused / expired / revoked elsewhere).
      //
      // 'local' scope: only THIS session is ended. The default ('global') would
      // also sign the same person out of their phone, their laptop and the other
      // portal — the very thing a refusal of one session should never do.
      await logSignOut(signOutReasonFor(denyReason));
      await supabase.auth.signOut({ scope: 'local' });
    }

    admitRef.current = admit;

    const onOnline = () => {
      if (pendingRef.current) void admit(pendingRef.current);
    };
    window.addEventListener('online', onOnline);

    // Coming back to the app re-asks the gate, so a phone signed out from the
    // laptop ("Where you're signed in") signs itself out the moment it is
    // looked at, not at its next hourly token refresh. Throttled: switching
    // tabs back and forth should not become a stream of requests.
    let lastVisibleCheck = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !admittedRef.current) return;
      if (Date.now() - lastVisibleCheck < 60_000) return;
      lastVisibleCheck = Date.now();
      void supabase.auth.getSession().then(({ data }) => admit(data.session));
    };
    document.addEventListener('visibilitychange', onVisible);

    void supabase.auth.getSession().then(({ data }) => admit(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      // Deferred to the next tick on purpose: supabase-js holds an internal
      // lock for the duration of this callback, and `admit` calls back into the
      // client (rpc, signOut), which would wait on that same lock forever.
      setTimeout(() => void admit(next), 0);
    });

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    offline,
    retry,
    signOut: async (reason: SignOutReason = 'user_initiated') => {
      // Before, not after: the RPC identifies the account from `auth.uid()`,
      // and once the token is gone there is nobody left to attribute the event
      // to. It never throws, so a failed write cannot trap anyone in the app.
      await logSignOut(reason);
      // This device only. Signing out of the phone must not sign the person out
      // of their laptop too — "Sign out everywhere else" in Settings is the
      // deliberate way to do that.
      await supabase.auth.signOut({ scope: 'local' });
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
