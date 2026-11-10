// confirm-password — step-up re-authentication for a session that is already
// signed in. Authenticated (verify_jwt = true).
//
// WHY THIS EXISTS
// Client and vendor sessions now last until 60 days of disuse. That is what
// people expect from Facebook and WhatsApp, and it means "holding this phone"
// is, most of the time, "being signed in". The few actions that would let a
// thief take money or the account — changing where payouts are sent, changing
// the password — therefore ask for the password again first, the way a banking
// app does. This endpoint is how that question is answered.
//
// WHAT IT DOES
//   1. identifies the caller and their session from the JWT;
//   2. refuses if the account has failed this check 5× in 15 minutes;
//   3. verifies the password against GoTrue (the canonical verifier — it knows
//      every hash format the project holds, including imported accounts);
//   4. revokes the throwaway session that verification minted, 'local' scope,
//      so the check never leaves a phantom "device" behind (the old in-browser
//      check did, once per password change);
//   5. records the outcome against THIS session. `session_recently_confirmed()`
//      in Postgres reads it, so the unlock is enforced by the database, not by
//      the dialog that asked.
//
// Answers: 200 {ok:true} · 401 {error:'wrong_password'} ·
//          429 {error:'too_many_attempts'} · 503 {error:'unavailable'}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, HttpError } from '../_shared/supabase.ts';

type Body = { password?: unknown };

/** The `session_id` claim of a JWT, without verifying it (the gateway and getUser already did). */
function sessionIdOf(token: string): string | null {
  try {
    const part = token.split('.')[1] ?? '';
    const padded = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(part.length / 4) * 4, '=');
    const claims = JSON.parse(atob(padded)) as { session_id?: unknown };
    return typeof claims.session_id === 'string' ? claims.session_id : null;
  } catch {
    return null;
  }
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const { data: who, error: whoErr } = await userClient(req).auth.getUser();
    if (whoErr || !who.user) throw new HttpError(401, 'unauthorized');

    const user = who.user;
    const sessionId = sessionIdOf(token);
    // Without a session id there is nothing to bind the confirmation to, and an
    // unbound confirmation would unlock every device at once.
    if (!sessionId || !user.email) throw new HttpError(401, 'unauthorized');

    const b = (await req.json().catch(() => null)) as Body | null;
    const password = typeof b?.password === 'string' ? b.password : '';
    if (password.length === 0 || password.length > 512) {
      return json(req, { error: 'wrong_password' }, 401);
    }

    const admin = adminClient();

    const { data: locked, error: lockErr } = await admin.rpc('password_confirmation_locked', {
      p_user_id: user.id,
    });
    if (lockErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'confirm_lock_check_failed',
          detail: lockErr.message,
        }),
      );
      return json(req, { error: 'unavailable' }, 503);
    }
    if (locked) return json(req, { error: 'too_many_attempts' }, 429);

    const verifier = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    // Announced like portal-sign-in's: the Custom Access Token hook refuses an
    // unannounced password grant.
    const { data: intentId, error: intentErr } = await admin.rpc('open_password_grant_intent', {
      p_email: user.email,
    });
    if (intentErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'grant_intent_failed',
          detail: intentErr.message,
        }),
      );
      return json(req, { error: 'unavailable' }, 503);
    }
    const { data: auth, error: authErr } = await verifier.auth
      .signInWithPassword({ email: user.email, password })
      .finally(() => admin.rpc('close_password_grant_intent', { p_id: intentId }));

    // Only a definite credential verdict counts as a failure. A GoTrue outage
    // or rate limit says nothing about the password and must not push anybody
    // towards the lockout.
    if (authErr || !auth?.session) {
      const status = (authErr as { status?: number } | null)?.status ?? 0;
      const code = (authErr as { code?: string } | null)?.code ?? '';
      const isVerdict = status === 400 && (code === 'invalid_credentials' || code === '');
      if (!isVerdict) {
        console.error(
          JSON.stringify({ level: 'error', message: 'confirm_password_unavailable', status, code }),
        );
        return json(req, { error: 'unavailable' }, 503);
      }
      await admin.rpc('record_password_confirmation', {
        p_user_id: user.id,
        p_session_id: sessionId,
        p_succeeded: false,
      });
      return json(req, { error: 'wrong_password' }, 401);
    }

    // The verification session is evidence, not a login. Gone before we answer.
    const { error: revokeErr } = await admin.auth.admin.signOut(auth.session.access_token, 'local');
    if (revokeErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'confirm_revoke_failed',
          detail: revokeErr.message,
        }),
      );
    }

    const { error: recErr } = await admin.rpc('record_password_confirmation', {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_succeeded: true,
    });
    if (recErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'confirm_record_failed',
          detail: recErr.message,
        }),
      );
      return json(req, { error: 'unavailable' }, 503);
    }

    return json(req, { ok: true }, 200);
  }),
);
