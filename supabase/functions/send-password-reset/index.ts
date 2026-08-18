// send-password-reset — password recovery, in two flavours:
//
//   action: 'admin'  (default) — a staff member resets someone else's password
//                     from the console. Requires `users.manage`.
//   action: 'self'   — a visitor asks for their own reset link from the admin
//                     portal's forgot-password form. Anonymous, and gated on a
//                     Cloudflare Turnstile token instead of a JWT.
//
// The endpoint is therefore `verify_jwt = false` and authenticates the admin
// action in-handler — the same shape as `client-sign-up`, and for the same
// reason: one function owns reset delivery, and a public action cannot live
// behind a gateway that demands a JWT the caller does not have yet.
//
// WHY THE SELF ACTION IS NOT `supabase.auth.resetPasswordForEmail`
// That is what the forgot-password form used to call, straight from the
// browser to GoTrue. Nothing of ours sat in that path, so there was nowhere to
// verify a CAPTCHA — anyone could drive Sinnapi's mail server at an address
// list for as long as they liked, and the recipients got GoTrue's unbranded
// template. Routing it here fixes both.
//
// THE SELF ACTION ALWAYS ANSWERS 200
// Unknown address, deleted account, no email on file, send failure — all return
// `{ ok: true }`. A public form that answers differently for a registered
// address is an account-enumeration oracle, and this one is reachable by
// anybody. The admin action keeps its real error codes: that caller is already
// trusted with the account list, and a silent no-op would leave them clicking a
// button that appears to do nothing.
//
// The admin action was moved off `resetPasswordForEmail` for a related reason:
// GoTrue's built-in recovery template was the last Sinnapi email not using the
// branded shell, and it gave the caller no say in where the link lands — which
// matters because the three portals are three different applications.
//
// THE LINK IS BUILT, NOT BORROWED
// Same reasoning as `client-sign-up`: `generateLink`'s ready-made `action_link`
// resolves through GoTrue's `/verify` endpoint in the implicit flow, and the
// portals run PKCE with no `code_verifier` for a flow the browser never started.
// So we take the `hashed_token` and address the right portal's reset screen with
// it, which redeems it via `verifyOtp`.
//
// WHICH PORTAL
// Decided from the account's own roles, not from where the admin happened to
// click: staff go to the admin console, vendors to the vendor portal, everyone
// else to the client portal. Sending a vendor a link into the client portal
// would drop them in an app that is not theirs and, because the portal gates
// refuse cross-portal sessions, would fail after they had already chosen a
// password.
//
// Required env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   SMTP_HOST / SMTP_USER / SMTP_PASS      — see _shared/email.ts
//   TURNSTILE_SECRET                       — see _shared/turnstile.ts
// Optional env (each falls back to PUBLIC_SITE_URL):
//   CLIENT_PORTAL_URL, VENDOR_PORTAL_URL, ADMIN_PORTAL_URL
//   RESET_LINK_EXPIRY_HOURS — copy only; the real expiry is the project's Auth
//                             "Email OTP Expiration" setting.
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { sendEmail, PUBLIC_SITE_URL } from '../_shared/email.ts';
import { requireCaptcha } from '../_shared/turnstile.ts';
import { passwordResetEmail } from './emails.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EXPIRY_HOURS = Number(Deno.env.get('RESET_LINK_EXPIRY_HOURS') ?? '24');

const ACTIONS = ['admin', 'self'] as const;
type Action = (typeof ACTIONS)[number];

type Body = {
  action?: string;
  /** admin only. */
  profileId?: string;
  /** self only. */
  email?: string;
  /** self only — Turnstile token. */
  captchaToken?: string;
};

function isAction(v: unknown): v is Action {
  return typeof v === 'string' && (ACTIONS as readonly string[]).includes(v);
}

function base(envKey: string): string {
  return (Deno.env.get(envKey) ?? PUBLIC_SITE_URL).replace(/\/+$/, '');
}

type Destination = { url: string; name: string };

/**
 * Where this account resets its password, from its roles.
 *
 * Staff first: an account holding an admin role belongs to the console and
 * nothing else, which is the same strict separation the sign-in gates enforce.
 */
function destinationFor(roleKeys: string[], isAdmin: boolean): Destination {
  if (isAdmin) return { url: `${base('ADMIN_PORTAL_URL')}/reset-password`, name: 'Admin Portal' };
  if (roleKeys.includes('vendor')) {
    return { url: `${base('VENDOR_PORTAL_URL')}/reset-password`, name: 'Vendor Portal' };
  }
  return { url: `${base('CLIENT_PORTAL_URL')}/reset-password`, name: 'Sinnapi' };
}

function resetUrl(dest: Destination, hashedToken: string): string {
  const u = new URL(dest.url);
  u.searchParams.set('token_hash', hashedToken);
  u.searchParams.set('type', 'recovery');
  return u.toString();
}

/** The profile columns both actions need, including the roles that pick a portal. */
// The `user_roles` embed names its FK explicitly: `profiles` is referenced twice
// from that table (profile_id and granted_by), and an unqualified embed is
// ambiguous — PostgREST answers PGRST201 and the whole read fails, taking every
// reset with it. The admin console's own queries have always named it; this one
// did not.
const PROFILE_COLUMNS =
  'id, email, full_name, status, deleted_at, user_roles!user_roles_profile_id_fkey(roles(key, is_admin))';

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  deleted_at: string | null;
  user_roles?: unknown;
};

/**
 * Flatten PostgREST's embedded roles.
 *
 * `roles` is a to-one embed that still arrives wrapped in an array in some
 * shapes, hence the normalising.
 */
function rolesOf(profile: ProfileRow): { keys: string[]; isAdmin: boolean } {
  type RoleRow = { key: string; is_admin: boolean };
  type UserRoleRow = { roles: RoleRow | RoleRow[] | null };
  const roleRows = (profile.user_roles ?? []) as UserRoleRow[];
  const roles: RoleRow[] = roleRows.flatMap((ur) =>
    ur.roles ? (Array.isArray(ur.roles) ? ur.roles : [ur.roles]) : [],
  );
  return { keys: roles.map((r) => r.key), isAdmin: roles.some((r) => r.is_admin) };
}

/**
 * Mint a recovery link for one account and mail it, addressed at the portal
 * that account actually belongs to. Shared verbatim by both actions — the only
 * thing that differs between them is who is allowed to ask and what the caller
 * is told afterwards.
 */
async function deliverReset(
  admin: ReturnType<typeof adminClient>,
  profile: ProfileRow,
): Promise<{ sent: boolean; email: string; portal: string }> {
  const email = String(profile.email).trim().toLowerCase();
  const { keys, isAdmin } = rolesOf(profile);
  const dest = destinationFor(keys, isAdmin);

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: dest.url },
  });
  if (linkErr || !link?.properties?.hashed_token) {
    throw new HttpError(400, `link_generation_failed:${linkErr?.message ?? 'no_token'}`);
  }

  const result = await sendEmail(
    passwordResetEmail({
      fullName: String(profile.full_name ?? email),
      email,
      resetUrl: resetUrl(dest, link.properties.hashed_token),
      portalName: dest.name,
      expiryHours: EXPIRY_HOURS,
    }),
  );

  return { sent: result.sent, email, portal: dest.name };
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const b = (await req.json().catch(() => null)) as Body | null;
    const action = b?.action ?? 'admin';
    if (!isAction(action)) throw new HttpError(422, 'invalid:action');

    const admin = adminClient();

    // ── self ────────────────────────────────────────────────────────────────
    // Anonymous. Everything after the CAPTCHA answers 200 no matter what it
    // finds; see the header comment for why.
    if (action === 'self') {
      const email = String(b?.email ?? '')
        .trim()
        .toLowerCase();
      // The one refusal that is safe to name: it describes the submission, not
      // the account behind it.
      if (!EMAIL_RE.test(email)) throw new HttpError(422, 'invalid:email');

      await requireCaptcha(req, b?.captchaToken);

      const { data: profile, error: profErr } = await admin
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('email', email)
        .maybeSingle();

      // A lookup failure is ours, not the caller's, and telling them apart is
      // exactly the distinction this action refuses to make. Logged, swallowed.
      if (profErr) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'self_reset_lookup_failed',
            detail: profErr.message,
          }),
        );
        return json(req, { ok: true }, 200);
      }

      const row = profile as ProfileRow | null;
      if (row && !row.deleted_at && row.email) {
        // Best-effort: a send failure here must not become a 502, which would
        // confirm the address exists.
        try {
          const { sent } = await deliverReset(admin, row);
          if (!sent) {
            console.error(JSON.stringify({ level: 'error', message: 'self_reset_send_failed' }));
          }
        } catch (e) {
          const detail = e instanceof Error ? e.message : 'unknown';
          console.error(JSON.stringify({ level: 'error', message: 'self_reset_failed', detail }));
        }
      }

      return json(req, { ok: true }, 200);
    }

    // ── admin ───────────────────────────────────────────────────────────────
    // AuthN + AuthZ with the caller's own JWT, before the service_role client
    // touches anything — same order as create-staff. Enforced here rather than
    // at the gateway because the `self` action above must stay anonymous.
    const callerId = await requireUser(req);
    const caller = userClient(req);
    const { data: allowed, error: permErr } = await caller.rpc('has_permission', {
      p_permission: 'users.manage',
    });
    if (permErr) throw new HttpError(400, permErr.message);
    if (!allowed) throw new HttpError(403, 'forbidden');

    const profileId = b?.profileId;
    if (!profileId || !UUID_RE.test(profileId)) throw new HttpError(422, 'invalid:profileId');

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', profileId)
      .maybeSingle();
    if (profErr) throw new HttpError(400, profErr.message);
    const row = profile as ProfileRow | null;
    if (!row || row.deleted_at) throw new HttpError(404, 'account_not_found');
    if (!row.email) throw new HttpError(422, 'no_email_on_file');

    const { sent, email, portal } = await deliverReset(admin, row);
    if (!sent) throw new HttpError(502, 'reset_email_failed');

    // A staff member causing a credential email to be sent to someone else is
    // exactly the kind of action the audit log exists for. Best-effort: the mail
    // has already gone, so failing the response now would only mislead.
    const { error: auditErr } = await admin.from('audit_logs').insert({
      actor_id: callerId,
      action: 'send_password_reset',
      entity_type: 'profiles',
      entity_id: profileId,
      after: { email, portal },
    });
    if (auditErr) {
      console.error(
        JSON.stringify({ level: 'error', message: 'audit_write_failed', detail: auditErr.message }),
      );
    }

    return json(req, { ok: true, email, portal }, 200);
  }),
);
