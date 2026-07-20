// create-staff — user-invoked (admin with `users.manage`). Provisions a Sinnapi
// STAFF account for the admin portal: creates the auth user with a generated
// one-time password, assigns the chosen staff (is_admin) roles, sets the initial
// profile status, flags `must_change_password`, and emails the credentials.
//
// Why an Edge Function (not client SQL): creating an `auth.users` row and setting
// a password are service_role-only operations, and the temporary password must
// never be generated or transported through the browser. Authorization is
// enforced with the caller's own JWT (`has_permission('users.manage')`) so the
// privileged service_role client only runs after the caller is verified.
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { generatePassword } from '../_shared/password.ts';
import { sendEmail, PUBLIC_SITE_URL } from '../_shared/email.ts';
import { staffWelcomeEmail } from './emails.ts';

const PROFILE_STATUSES = ['active', 'suspended', 'pending'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roleIds?: string[];
  status?: string;
};

function clean(v?: string): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

function req(cond: boolean, field: string) {
  if (!cond) throw new HttpError(422, `missing_or_invalid:${field}`);
}

Deno.serve(
  handler(async (request) => {
    if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    // --- AuthN + AuthZ: caller must be signed in and hold `users.manage`.
    const callerId = await requireUser(request);
    const caller = userClient(request);
    const { data: allowed, error: permErr } = await caller.rpc('has_permission', {
      p_permission: 'users.manage',
    });
    if (permErr) throw new HttpError(400, permErr.message);
    if (!allowed) throw new HttpError(403, 'forbidden');

    const b = (await request.json().catch(() => null)) as Body | null;
    if (!b) throw new HttpError(400, 'invalid_json');

    // --- Validate (mirrors the client zod schema).
    const firstName = clean(b.firstName);
    const lastName = clean(b.lastName);
    const middleName = clean(b.middleName);
    const email = clean(b.email)?.toLowerCase() ?? null;
    const phone = clean(b.phone);
    const status = b.status ?? 'active';
    const roleIds = Array.isArray(b.roleIds) ? [...new Set(b.roleIds)] : [];

    req(!!firstName, 'firstName');
    req(!!lastName, 'lastName');
    req(!!email && EMAIL_RE.test(email), 'email');
    req(PROFILE_STATUSES.includes(status), 'status');
    req(roleIds.length > 0 && roleIds.every((id) => UUID_RE.test(id)), 'roleIds');

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const admin = adminClient();

    // --- Roles must exist AND be staff (is_admin) roles: this page provisions
    // Sinnapi staff only, never client/vendor accounts.
    const { data: roles, error: rolesErr } = await admin
      .from('roles')
      .select('id, name, is_admin')
      .in('id', roleIds);
    if (rolesErr) throw new HttpError(400, rolesErr.message);
    if (!roles || roles.length !== roleIds.length) throw new HttpError(422, 'invalid:roleIds');
    if (roles.some((r) => !r.is_admin)) throw new HttpError(422, 'non_staff_role');

    // --- Create the auth user with a generated one-time password. The
    // `handle_new_user` trigger mirrors the metadata into `profiles` and adds the
    // default (client) role; we correct both below. `must_change_password` in
    // user_metadata is what the admin-portal ProtectedRoute enforces.
    const tempPassword = generatePassword(16);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email!,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        phone,
        must_change_password: true,
      },
    });
    if (createErr || !created?.user) {
      // Surface an already-registered email as a clean conflict.
      const msg = createErr?.message ?? 'unknown';
      const httpStatus = /already|exists|registered|duplicate/i.test(msg) ? 409 : 400;
      throw new HttpError(httpStatus, `account_creation_failed:${msg}`);
    }
    const newId = created.user.id;

    // --- Correct the profile: apply the chosen status + name parts + creator.
    const { error: profErr } = await admin
      .from('profiles')
      .update({ status, phone, created_by: callerId })
      .eq('id', newId);
    if (profErr) throw new HttpError(400, profErr.message);

    // --- Replace the trigger's default role with the chosen staff roles.
    await admin.from('user_roles').delete().eq('profile_id', newId);
    const { error: roleInsErr } = await admin
      .from('user_roles')
      .insert(roleIds.map((role_id) => ({ profile_id: newId, role_id })));
    if (roleInsErr) throw new HttpError(400, roleInsErr.message);

    // --- Deliver the credentials (best-effort: the account already exists, so an
    // email failure must not fail the request — the admin can trigger a reset).
    const portalUrl = Deno.env.get('ADMIN_PORTAL_URL') ?? PUBLIC_SITE_URL;
    const emailResult = await sendEmail(
      staffWelcomeEmail({
        fullName,
        email: email!,
        tempPassword,
        portalUrl,
        roleNames: roles.map((r) => r.name),
      }),
    ).catch((e) => ({ sent: false, error: (e as Error).message }));

    return json(
      request,
      {
        id: newId,
        emailSent: emailResult.sent,
        ...(emailResult.error && { emailWarning: emailResult.error }),
      },
      201,
    );
  }),
);
