// manage-staff — user-invoked (admin with `users.manage`). Runs the staff
// lifecycle actions that must touch BOTH the profile row and the auth account:
//
//   suspend  — profile.status → 'suspended' and the auth login is banned, so a
//              blocked user can't sign in anywhere, not just the admin portal.
//   activate — profile.status → 'active' and the ban is lifted.
//   remove   — soft-delete the profile (deleted_at / deleted_by) AND permanently
//              ban the auth login. The row is retained for audit; the email is
//              freed for reuse by the `ux_profiles_email … where deleted_at is
//              null` partial index.
//
// Banning is a service_role auth-admin operation, so it can't be done from the
// browser. The caller is authorized with their own JWT first, and can never act
// on their own account (locking yourself out is always a mistake).
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ['suspend', 'activate', 'remove'] as const;
type Action = (typeof ACTIONS)[number];

// Supabase expects a Go duration string; 'none' lifts a ban. ~100 years reads as
// permanent for our purposes.
const BAN_FOREVER = '876000h';
const BAN_NONE = 'none';

type Body = { userId?: string; action?: string };

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
    if (!b.action || !ACTIONS.includes(b.action as Action))
      throw new HttpError(422, 'invalid:action');
    if (b.userId === callerId) throw new HttpError(422, 'cannot_modify_self');
    const action = b.action as Action;

    const admin = adminClient();

    const { data: profile, error: loadErr } = await admin
      .from('profiles')
      .select('id, deleted_at')
      .eq('id', b.userId)
      .maybeSingle();
    if (loadErr) throw new HttpError(400, loadErr.message);
    if (!profile || profile.deleted_at) throw new HttpError(404, 'user_not_found');

    if (action === 'remove') {
      const { error } = await admin
        .from('profiles')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: callerId,
          status: 'suspended',
        })
        .eq('id', b.userId);
      if (error) throw new HttpError(400, error.message);

      const { error: banErr } = await admin.auth.admin.updateUserById(b.userId, {
        ban_duration: BAN_FOREVER,
      });
      if (banErr) throw new HttpError(400, `auth_ban_failed:${banErr.message}`);
    } else {
      const suspend = action === 'suspend';
      const { error } = await admin
        .from('profiles')
        .update({ status: suspend ? 'suspended' : 'active' })
        .eq('id', b.userId);
      if (error) throw new HttpError(400, error.message);

      const { error: banErr } = await admin.auth.admin.updateUserById(b.userId, {
        ban_duration: suspend ? BAN_FOREVER : BAN_NONE,
      });
      if (banErr) throw new HttpError(400, `auth_ban_failed:${banErr.message}`);
    }

    return json(request, { ok: true }, 200);
  }),
);
