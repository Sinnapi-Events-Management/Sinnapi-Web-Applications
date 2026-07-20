// reset-staff-password — user-invoked (admin with `users.manage`). Sets a fresh
// generated one-time password on a staff account, re-flags `must_change_password`
// so the user must choose their own on next sign-in, and emails the credentials.
//
// Service_role-only: setting another user's password and merging their
// user_metadata are auth-admin operations, and the new password must never pass
// through the browser. The caller is authorized with their own JWT first.
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { generatePassword } from '../_shared/password.ts';
import { sendEmail, PUBLIC_SITE_URL } from '../_shared/email.ts';
import { staffPasswordResetEmail } from './emails.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = { userId?: string };

Deno.serve(
  handler(async (request) => {
    if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const callerId = await requireUser(request);
    const caller = userClient(request);
    const { data: allowed, error: permErr } = await caller.rpc('has_permission', {
      p_permission: 'users.manage',
    });
    if (permErr) throw new HttpError(400, permErr.message);
    if (!allowed) throw new HttpError(403, 'forbidden');

    const b = (await request.json().catch(() => null)) as Body | null;
    if (!b?.userId || !UUID_RE.test(b.userId)) throw new HttpError(422, 'invalid:userId');
    if (b.userId === callerId) throw new HttpError(422, 'use_your_own_reset_flow');

    const admin = adminClient();

    // --- Load the target's profile (service_role bypasses RLS).
    const { data: profile, error: loadErr } = await admin
      .from('profiles')
      .select('id, full_name, email, deleted_at')
      .eq('id', b.userId)
      .maybeSingle();
    if (loadErr) throw new HttpError(400, loadErr.message);
    if (!profile || profile.deleted_at) throw new HttpError(404, 'user_not_found');

    // --- Merge (never overwrite) the existing user_metadata so a reset doesn't
    // drop the name parts / phone captured at creation.
    const { data: existing } = await admin.auth.admin.getUserById(b.userId);
    const meta = { ...(existing?.user?.user_metadata ?? {}), must_change_password: true };

    const tempPassword = generatePassword(16);
    const { error: updErr } = await admin.auth.admin.updateUserById(b.userId, {
      password: tempPassword,
      user_metadata: meta,
    });
    if (updErr) throw new HttpError(400, `password_reset_failed:${updErr.message}`);

    const portalUrl = Deno.env.get('ADMIN_PORTAL_URL') ?? PUBLIC_SITE_URL;
    const emailResult = await sendEmail(
      staffPasswordResetEmail({
        fullName: profile.full_name ?? profile.email ?? 'there',
        email: profile.email!,
        tempPassword,
        portalUrl,
      }),
    ).catch((e) => ({ sent: false, error: (e as Error).message }));

    return json(
      request,
      {
        ok: true,
        emailSent: emailResult.sent,
        ...(emailResult.error && { emailWarning: emailResult.error }),
      },
      200,
    );
  }),
);
