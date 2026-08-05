import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { checkPortalAccess, logSignOut, type SignOutReason } from './portalAccess';

type AuthState = {
  session: Session | null;
  user: User | null;
  /** Role keys the account holds, straight from the portal gate. */
  roles: string[];
  loading: boolean;
  /** `reason` is recorded in the audit trail; defaults to a deliberate exit. */
  signOut: (reason?: SignOutReason) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Holds the session — but only a session this portal has agreed to.
 *
 * A Supabase session is project-wide, not app-wide: every Sinnapi portal shares
 * one auth backend, so "there is a session" says nothing about whether its
 * owner belongs in the admin console. `portal-sign-in` settles that for the
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

  // Verdicts are async, so a slow answer about a session that has since been
  // replaced must not overwrite a newer one. Each check takes a ticket and
  // discards itself if it is no longer the latest.
  const ticketRef = useRef(0);
  // Whether an admitted session is currently held — decides how to treat a
  // check that could not reach the server (see below).
  const admittedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function admit(next: Session | null) {
      const ticket = ++ticketRef.current;

      if (!next) {
        if (!mounted) return;
        admittedRef.current = false;
        setSession(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      const { verdict, roles: roleKeys } = await checkPortalAccess();
      if (!mounted || ticket !== ticketRef.current) return;

      if (verdict === 'allowed') {
        admittedRef.current = true;
        setSession(next);
        setRoles(roleKeys);
        setLoading(false);
        return;
      }

      // `unknown` is "we could not ask", not "no". For a session already
      // admitted — a background token refresh, say — keeping it is right: one
      // flaky request should not throw a working user out of the app. For a
      // session never vetted, the only safe answer is no.
      if (verdict === 'unknown' && admittedRef.current) {
        setSession(next);
        setLoading(false);
        return;
      }

      admittedRef.current = false;
      setSession(null);
      setRoles([]);
      setLoading(false);
      // Refused sessions are revoked, not just hidden: leaving a live token in
      // localStorage would let the next tab pick it straight back up. Logged
      // first, and as an ejection rather than a sign-out: a session this portal
      // turned away is worth telling apart from one its owner ended.
      await logSignOut('portal_refused');
      await supabase.auth.signOut();
    }

    void supabase.auth.getSession().then(({ data }) => admit(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      // Deferred to the next tick on purpose: supabase-js holds an internal
      // lock for the duration of this callback, and `admit` calls back into the
      // client (rpc, signOut), which would wait on that same lock forever.
      setTimeout(() => void admit(next), 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    signOut: async (reason: SignOutReason = 'user_initiated') => {
      // Before, not after: the RPC identifies the account from `auth.uid()`,
      // and once the token is gone there is nobody left to attribute the event
      // to. It never throws, so a failed write cannot trap anyone in the app.
      await logSignOut(reason);
      await supabase.auth.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
