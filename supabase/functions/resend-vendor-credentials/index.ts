// resend-vendor-credentials — user-invoked (admin with `users.manage`). Issues a
// FRESH one-time password to an approved vendor who has never signed in, and
// emails it to the address on their account.
//
// THE PROBLEM IT SOLVES
// `promote-intake` provisions the vendor's account with a generated one-time
// password and mails it once. That mail is the only copy — the password is
// never stored, here or anywhere — so when it is lost to a spam folder, a typo
// in the address, or a forwarded inbox nobody reads, the vendor is approved,
// live, listed, and unable to get in. There was no staffed route back: the
// admin could see the account existed and could do nothing about it.
//
// WHY A NEW PASSWORD AND NOT "RESEND"
// Nothing can be resent. What was mailed cannot be recovered, so the only
// honest action is to replace it — which also revokes the old one, closing off
// a credential that has been sitting in an unread inbox for weeks.
//
// WHY NOT JUST SEND A RESET LINK
// That flow exists (`send-password-reset`) and stays available for any vendor.
// It is the wrong first answer here: a vendor who never received working
// credentials is being asked to "reset" a password they were never able to use,
// which reads as an error on their part. The two live side by side in the
// console for that reason.
//
// NEVER-SIGNED-IN IS ENFORCED, NOT ADVISED
// The console hides the action once `last_login_at` is set, and this refuses it
// too. Replacing a working password that a vendor chose themselves — silently,
// from a support screen — is a different and much less defensible act than
// finishing a provisioning that never completed. An admin who genuinely needs
// that uses the reset link, which puts the vendor in control of the change.
//
// Optional env:
//   VENDOR_PORTAL_URL — sign-in URL in the mail; falls back to PUBLIC_SITE_URL.
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { generatePassword } from '../_shared/password.ts';
import { sendEmail, PUBLIC_SITE_URL } from '../_shared/email.ts';
import { vendorCredentialsEmail } from './emails.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * States a credential may be issued into. A suspended, deactivated or blocked
 * account is refused at the portal gate anyway, so mailing it a password would
 * produce a working-looking credential that cannot sign in — the most confusing
 * possible outcome for the recipient, and a support ticket by construction.
 */
const ISSUABLE_STATUSES = ['active', 'pending'];

type Body = { profileId?: string };

type RoleRow = { key: string; is_admin: boolean };
type UserRoleRow = { roles: RoleRow | RoleRow[] | null };

/** Flatten PostgREST's to-one `roles` embed, which can arrive wrapped. */
function rolesOf(userRoles: unknown): { keys: string[]; isStaff: boolean } {
  const rows = (userRoles ?? []) as UserRoleRow[];
  const roles = rows.flatMap((ur) =>
    ur.roles ? (Array.isArray(ur.roles) ? ur.roles : [ur.roles]) : [],
  );
  return { keys: roles.map((r) => r.key), isStaff: roles.some((r) => r.is_admin) };
}

Deno.serve(
  handler(async (request) => {
    if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    // --- AuthN + AuthZ with the caller's own JWT, before the service_role
    // client touches anything — same order as create-staff.
    const callerId = await requireUser(request);
    const caller = userClient(request);
    const { data: allowed, error: permErr } = await caller.rpc('has_permission', {
      p_permission: 'users.manage',
    });
    if (permErr) throw new HttpError(400, permErr.message);
    if (!allowed) throw new HttpError(403, 'forbidden');

    const b = (await request.json().catch(() => null)) as Body | null;
    if (!b?.profileId || !UUID_RE.test(b.profileId)) throw new HttpError(422, 'invalid:profileId');
    if (b.profileId === callerId) throw new HttpError(422, 'cannot_modify_self');

    const admin = adminClient();

    // `profiles` has two FKs from `user_roles` (profile_id and granted_by), so
    // the embed must name the one we want — the role assignment — or PostgREST
    // throws PGRST201 (ambiguous relationship) and the whole read fails.
    const { data: profile, error: loadErr } = await admin
      .from('profiles')
      .select(
        'id, full_name, email, status, last_login_at, deleted_at, ' +
          'user_roles!user_roles_profile_id_fkey(roles(key, is_admin))',
      )
      .eq('id', b.profileId)
      .maybeSingle();
    if (loadErr) throw new HttpError(400, loadErr.message);
    if (!profile || profile.deleted_at) throw new HttpError(404, 'vendor_account_not_found');
    if (!profile.email) throw new HttpError(422, 'no_email_on_file');

    const { keys, isStaff } = rolesOf(profile.user_roles);
    if (isStaff) throw new HttpError(422, 'staff_account');
    if (!keys.includes('vendor')) throw new HttpError(422, 'not_a_vendor_account');
    if (profile.last_login_at) throw new HttpError(409, 'already_signed_in');
    if (!ISSUABLE_STATUSES.includes(profile.status)) throw new HttpError(409, 'account_not_active');

    // The business name is context for the recipient, not a requirement: an
    // account whose promotion stalled before `approve_vendor` owns no listing
    // and is precisely the case this endpoint exists to rescue.
    const { data: vendor } = await admin
      .from('vendors')
      .select('business_name')
      .eq('owner_id', b.profileId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // --- Merge (never overwrite) the existing user_metadata so re-issuing does
    // not drop the name / phone captured at promotion.
    const { data: existing } = await admin.auth.admin.getUserById(b.profileId);
    const meta = { ...(existing?.user?.user_metadata ?? {}), must_change_password: true };

    const tempPassword = generatePassword(16);
    const { error: updErr } = await admin.auth.admin.updateUserById(b.profileId, {
      password: tempPassword,
      user_metadata: meta,
      // A promotion that pre-dated `email_confirm` would leave the vendor
      // unable to use even a valid password. Confirming here costs nothing for
      // an already-confirmed account and removes that dead end.
      email_confirm: true,
    });
    if (updErr) throw new HttpError(400, `credential_reissue_failed:${updErr.message}`);

    const portalUrl = Deno.env.get('VENDOR_PORTAL_URL') ?? PUBLIC_SITE_URL;
    const emailResult = await sendEmail(
      vendorCredentialsEmail({
        fullName: profile.full_name ?? profile.email,
        email: profile.email,
        businessName: vendor?.business_name ?? null,
        tempPassword,
        portalUrl,
      }),
    ).catch((e) => ({ sent: false, error: (e as Error).message }));

    // An admin causing a credential to reach an inbox is exactly what the audit
    // log is for. Best-effort — the password has already been changed, so
    // failing the response now would misreport what happened.
    const { error: auditErr } = await admin.from('audit_logs').insert({
      actor_id: callerId,
      action: 'resend_vendor_credentials',
      entity_type: 'profiles',
      entity_id: b.profileId,
      after: { email: profile.email, emailSent: emailResult.sent },
    });
    if (auditErr) {
      console.error(
        JSON.stringify({ level: 'error', message: 'audit_write_failed', detail: auditErr.message }),
      );
    }

    // The send failure IS the outcome here, unlike create-staff where an account
    // still got created: the whole request was "put a credential in their
    // inbox", and the old password is now dead either way. Reported as a hard
    // failure so the admin retries rather than assuming the vendor was helped.
    if (!emailResult.sent) throw new HttpError(502, 'credentials_email_failed');

    return json(request, { ok: true, email: profile.email }, 200);
  }),
);
