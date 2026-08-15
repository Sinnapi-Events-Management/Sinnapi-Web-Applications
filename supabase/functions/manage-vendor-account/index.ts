// manage-vendor-account — user-invoked (admin with `users.manage`). Moves a
// vendor OWNER ACCOUNT between the lifecycle states added in 0810a, touching
// both halves of "can this person sign in":
//
//   suspend    — TEMPORARY. `profiles.status → 'suspended'`, `suspended_until`
//                set, and the auth login banned until exactly that instant.
//   deactivate — indefinite, not punitive. Status → 'deactivated', login banned.
//   block      — indefinite and punitive. Status → 'blocked', login banned.
//   activate   — status → 'active', ban lifted.
//
// WHY A SEPARATE FUNCTION FROM `manage-staff`
// They look alike and are not the same operation. `manage-staff` knows two
// states and no reason; this one knows four, requires a justification for every
// state that removes access, and carries an expiry. Folding the two together
// would mean either weakening the justification requirement here or imposing it
// on a staff flow that has no field to type it into — and the merged handler
// would be a switch over "which caller am I serving", which is two functions
// wearing one name.
//
// WHY THE TWO HALVES EXPIRE INDEPENDENTLY
// A suspension's ban is set to the same instant as `suspended_until`, so GoTrue
// releases its half on its own clock and the hourly `expire_vendor_suspensions`
// sweep releases the profile's. Neither depends on the other having run: an
// account whose ban lapsed but whose status has not is still refused by the
// portal gates, and an account whose status flipped back but whose ban has not
// lapsed simply cannot mint a token yet. Both failure directions are closed,
// and they close in the safe direction.
//
// WRITE ORDER IS DELIBERATE: profile first, then the ban. If the ban call fails
// the account is already refused by `_evaluate_portal_access` on its next
// session check, which is a state that fails closed. The reverse order would
// leave a banned account whose row still reads `active` — indistinguishable, to
// the operator looking at the console, from a working account.
//
// STAFF ARE OUT OF SCOPE ON PURPOSE. The target must hold `vendor` and must not
// hold an admin role: a staff account suspended from a vendor page would be an
// audit entry in the wrong domain, and the staff flow already exists.
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACTIONS = ['suspend', 'activate', 'deactivate', 'block'] as const;
type Action = (typeof ACTIONS)[number];

/** The status each action lands the account on. */
const TARGET_STATUS: Record<Action, string> = {
  suspend: 'suspended',
  activate: 'active',
  deactivate: 'deactivated',
  block: 'blocked',
};

/**
 * Actions that remove access must say why. The reason is what a colleague reads
 * months later when asked to reverse it, and "no reason recorded" makes every
 * such decision unreviewable. `activate` is exempt: restoring access is the
 * benign direction, and a note there is useful but not owed.
 */
const REASON_REQUIRED: Action[] = ['suspend', 'deactivate', 'block'];
const REASON_MIN = 4;
const REASON_MAX = 500;

// Supabase expects a Go duration string; 'none' lifts a ban. ~100 years reads
// as permanent for our purposes (same constant as manage-staff).
const BAN_FOREVER = '876000h';
const BAN_NONE = 'none';

// A suspension is a hold, not a sentence. Anything beyond a year is a block
// wearing the wrong label, and capping it here keeps the two decisions honestly
// separated instead of letting one impersonate the other.
const MAX_SUSPENSION_DAYS = 365;
const MIN_SUSPENSION_MINUTES = 15;

type Body = {
  profileId?: string;
  action?: string;
  reason?: string;
  /** ISO-8601 instant. Required for `suspend`, ignored otherwise. */
  suspendedUntil?: string;
};

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

function isAction(v: unknown): v is Action {
  return typeof v === 'string' && (ACTIONS as readonly string[]).includes(v);
}

/**
 * Validate the suspension end and turn it into a GoTrue ban duration.
 *
 * Rounded UP to the next whole hour because GoTrue's duration string is the only
 * lever available, and a ban that ends slightly late is harmless — the profile
 * has already flipped back to `active` by then, so the only effect is that the
 * vendor's first sign-in attempt inside that final hour is refused. Rounding
 * down would do the opposite and let a suspended account back in early.
 */
function suspensionBan(raw: string | undefined): { until: string; banDuration: string } {
  const until = new Date(String(raw ?? ''));
  if (Number.isNaN(until.getTime())) throw new HttpError(422, 'invalid:suspendedUntil');

  const ms = until.getTime() - Date.now();
  if (ms < MIN_SUSPENSION_MINUTES * 60_000) throw new HttpError(422, 'suspension_too_short');
  if (ms > MAX_SUSPENSION_DAYS * 24 * 60 * 60_000) throw new HttpError(422, 'suspension_too_long');

  return { until: until.toISOString(), banDuration: `${Math.ceil(ms / 3_600_000)}h` };
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
    if (!isAction(b.action)) throw new HttpError(422, 'invalid:action');
    if (b.profileId === callerId) throw new HttpError(422, 'cannot_modify_self');

    const action = b.action;
    const reason = String(b.reason ?? '').trim();
    if (REASON_REQUIRED.includes(action) && reason.length < REASON_MIN) {
      throw new HttpError(422, 'reason_required');
    }
    if (reason.length > REASON_MAX) throw new HttpError(422, 'reason_too_long');

    const suspension = action === 'suspend' ? suspensionBan(b.suspendedUntil) : null;

    const admin = adminClient();

    // --- Load the target and prove it is a vendor account we may act on.
    // `profiles` has two FKs from `user_roles` (profile_id and granted_by), so
    // the embed must name the one we want — the role assignment — or PostgREST
    // throws PGRST201 (ambiguous relationship) and the whole read fails.
    const { data: profile, error: loadErr } = await admin
      .from('profiles')
      .select(
        'id, full_name, email, status, suspended_until, deleted_at, ' +
          'user_roles!user_roles_profile_id_fkey(roles(key, is_admin))',
      )
      .eq('id', b.profileId)
      .maybeSingle();
    if (loadErr) throw new HttpError(400, loadErr.message);
    if (!profile || profile.deleted_at) throw new HttpError(404, 'vendor_account_not_found');

    const { keys, isStaff } = rolesOf(profile.user_roles);
    if (isStaff) throw new HttpError(422, 'staff_account');
    if (!keys.includes('vendor')) throw new HttpError(422, 'not_a_vendor_account');

    const nextStatus = TARGET_STATUS[action];
    if (profile.status === nextStatus && action !== 'suspend') {
      // Not an error worth failing on for the reversible states, but re-suspending
      // IS meaningful (it changes the end date), hence the exemption above.
      return json(request, { ok: true, status: nextStatus, unchanged: true }, 200);
    }

    // --- Profile first (see the header note on write order).
    const { error: updErr } = await admin
      .from('profiles')
      .update({
        status: nextStatus,
        // A restored account keeps no stale explanation of a state it is no
        // longer in; the audit log remains the history.
        status_reason: action === 'activate' ? null : reason,
        status_changed_at: new Date().toISOString(),
        status_changed_by: callerId,
        suspended_until: suspension?.until ?? null,
      })
      .eq('id', b.profileId);
    if (updErr) throw new HttpError(400, updErr.message);

    const banDuration = action === 'activate' ? BAN_NONE : (suspension?.banDuration ?? BAN_FOREVER);
    const { error: banErr } = await admin.auth.admin.updateUserById(b.profileId, {
      ban_duration: banDuration,
    });
    if (banErr) throw new HttpError(400, `auth_ban_failed:${banErr.message}`);

    // --- Audit. Best-effort: the state change has already landed, so failing
    // the response now would tell the caller their action did not happen.
    const { error: auditErr } = await admin.from('audit_logs').insert({
      actor_id: callerId,
      action: `vendor_account_${action}`,
      entity_type: 'profiles',
      entity_id: b.profileId,
      before: { status: profile.status, suspended_until: profile.suspended_until },
      after: {
        status: nextStatus,
        reason: reason || null,
        suspended_until: suspension?.until ?? null,
        ban_duration: banDuration,
      },
    });
    if (auditErr) {
      console.error(
        JSON.stringify({ level: 'error', message: 'audit_write_failed', detail: auditErr.message }),
      );
    }

    return json(
      request,
      { ok: true, status: nextStatus, suspendedUntil: suspension?.until ?? null },
      200,
    );
  }),
);
