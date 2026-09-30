// promote-intake — user-invoked (admin with `vendor.approve`). Promotes an
// approved public intake (`vendor_application_intake`) into the auth-bound
// pipeline: provisions an account for the applicant, mirrors the submission
// into `vendor_applications`, then runs the existing `approve_vendor` RPC to
// create the vendor + trial subscription in one step. The intake is linked and
// marked 'approved'.
//
// ONE VENDOR PER OWNER
// Promotion refuses an applicant who already owns a live vendor. `approve_vendor`
// inserts into `vendors` unconditionally, so approving two intakes from the same
// person used to create two live listings and two trial subscriptions — and the
// vendor portal resolves the signed-in vendor with `.maybeSingle()` on
// `owner_id`, which errors on a second row and locks them out entirely.
// `ux_vendors_one_live_per_owner` enforces this in the schema; the check here
// exists so the reviewer gets a message instead of a constraint violation raised
// after an application row has already been written. See `resolveApplicantAccount`.
//
// Why an Edge Function (not a SQL RPC): promotion creates an `auth.users` row
// (only the service_role auth-admin API can do that), while `approve_vendor`
// must run as the calling admin (its `has_permission('vendor.approve')` check
// reads `auth.uid()`). So we combine a service-role client (privileged writes +
// auth admin) with the caller's user-scoped client (for approve_vendor).
//
// Optional env:
//   VENDOR_PORTAL_URL — sign-in URL in the approval email; falls back to
//                       PUBLIC_SITE_URL when unset.
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generatePassword } from '../_shared/password.ts';
import { sendEmail, PUBLIC_SITE_URL } from '../_shared/email.ts';
import { vendorApprovedEmail } from './emails.ts';

type Body = { intakeId?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Applicant = { email: string; ownerFullName: string | null; ownerPhone: string };

/**
 * Resolve the account the vendor will be created under, and the one-time
 * password (if any) the approval email must carry.
 *
 * `tempPassword` is non-null whenever the recipient has no other way in — a
 * brand new account, or an existing one that has never been signed into. It is
 * null only for an account already in use, which keeps its own password.
 *
 * WHY THIS IS NOT JUST "REUSE IF THE EMAIL EXISTS"
 * That is what it used to be, and it produced the incident this code now guards
 * against. One applicant submitted three times, compliance approved two of
 * them, and the second approval found the profile the FIRST had created — so it
 * reused the account, sent no password, and switched the email to "you already
 * have an account". The applicant had no credential and nobody could explain
 * why. Two rules fix it:
 *
 *   1. An owner who already has a live vendor is refused outright. The second
 *      approval should never have been possible.
 *   2. Reuse only skips the password when the account has actually been used.
 *      Never-signed-in means the credential never arrived, so issue a fresh one.
 */
async function resolveApplicantAccount(
  admin: SupabaseClient,
  a: Applicant,
): Promise<{ applicantId: string; tempPassword: string | null }> {
  const { data: existingProfile, error: profErr } = await admin
    .from('profiles')
    .select('id, last_login_at')
    .eq('email', a.email)
    .limit(1)
    .maybeSingle();
  if (profErr) throw new HttpError(400, profErr.message);

  if (!existingProfile) {
    // A one-time password provisioned server-side (never through the browser),
    // delivered by the approval email — same contract as create-staff.
    const tempPassword = generatePassword(16);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: a.email,
      password: tempPassword,
      email_confirm: true,
      // `handle_new_user` mirrors full_name + phone into the profile. Phone is
      // NOT set on auth.users: that field is the SMS/OTP identity, is uniquely
      // constrained and expects a confirmation flow.
      user_metadata: {
        full_name: a.ownerFullName,
        phone: a.ownerPhone || null,
        must_change_password: true,
      },
    });
    if (createErr || !created?.user) {
      throw new HttpError(400, `account_creation_failed:${createErr?.message ?? 'unknown'}`);
    }
    return { applicantId: created.user.id, tempPassword };
  }

  // --- Rule 1: refuse a second vendor for the same owner, before any write.
  //
  // `approve_vendor` does an unconditional insert into `vendors`, so approving
  // two intakes from one applicant produced two live, publicly listed vendors
  // and two trial subscriptions. Worse, `VendorProvider` resolves the signed-in
  // vendor with `.maybeSingle()` on `owner_id`, which ERRORS on a second row —
  // the owner is locked out of their own portal while their business sits
  // approved and visible.
  //
  // `ux_vendors_one_live_per_owner` now makes that state impossible in the
  // schema, but a unique violation raised from inside approve_vendor would reach
  // the reviewer as raw SQL, after an application row had already been written.
  // Refusing here fails cleanly, with a message naming the vendor in the way.
  const { data: liveVendor, error: vendorErr } = await admin
    .from('vendors')
    .select('id, business_name')
    .eq('owner_id', existingProfile.id)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (vendorErr) throw new HttpError(400, vendorErr.message);
  if (liveVendor) {
    throw new HttpError(
      409,
      `owner_already_has_vendor:${liveVendor.business_name ?? liveVendor.id}`,
    );
  }

  // --- Rule 2: an account that has never been signed into gets a fresh
  // credential, because whatever it holds demonstrably never got used.
  //
  // An account that HAS been signed into keeps its password: that is a client
  // upgrading to a vendor, and silently replacing a password they chose is not
  // ours to do. `resend-vendor-credentials` covers that case on request, on this
  // same never-signed-in rule.
  if (existingProfile.last_login_at) {
    return { applicantId: existingProfile.id, tempPassword: null };
  }

  const tempPassword = generatePassword(16);
  const { data: authUser } = await admin.auth.admin.getUserById(existingProfile.id);
  const meta = { ...(authUser?.user?.user_metadata ?? {}), must_change_password: true };
  const { error: pwErr } = await admin.auth.admin.updateUserById(existingProfile.id, {
    password: tempPassword,
    user_metadata: meta,
    // A pre-existing unconfirmed account could not use even a valid password.
    email_confirm: true,
  });
  if (pwErr) {
    // Non-fatal: the promotion is still correct and an admin can re-issue from
    // the console. Reporting null here means the email falls back to the
    // "you already have an account" copy, so the failure is logged loudly.
    console.error('[PROMOTE-INTAKE] credential reissue failed:', pwErr.message);
    return { applicantId: existingProfile.id, tempPassword: null };
  }

  return { applicantId: existingProfile.id, tempPassword };
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
    const uid = await requireUser(req);

    const user = userClient(req);
    const admin = adminClient();

    // --- AuthZ: caller must hold `vendor.approve` (same gate as approve_vendor).
    const { data: allowed, error: permErr } = await user.rpc('has_permission', {
      p_permission: 'vendor.approve',
    });
    if (permErr) throw new HttpError(400, permErr.message);
    if (!allowed) throw new HttpError(403, 'forbidden');

    const b = (await req.json().catch(() => null)) as Body | null;
    if (!b?.intakeId || !UUID_RE.test(b.intakeId)) throw new HttpError(422, 'invalid:intakeId');

    // --- Load the intake (service_role bypasses RLS).
    const { data: intake, error: loadErr } = await admin
      .from('vendor_application_intake')
      .select('*')
      .eq('id', b.intakeId)
      .maybeSingle();
    if (loadErr) throw new HttpError(400, loadErr.message);
    if (!intake) throw new HttpError(404, 'intake_not_found');

    // Idempotent: already promoted → return the existing application.
    if (intake.promoted_application_id) {
      return json(req, { applicationId: intake.promoted_application_id, duplicate: true }, 200);
    }
    if (intake.status === 'rejected') throw new HttpError(409, 'intake_rejected');
    // A withdrawn intake was superseded by a newer submission from the same
    // applicant, or retired by an admin. Approving it would promote details the
    // applicant has already replaced — and, if the replacement is approved too,
    // create the second vendor this whole change exists to prevent.
    if (intake.status === 'withdrawn') throw new HttpError(409, 'intake_withdrawn');

    // --- Resolve the applicant's account (see `resolveApplicantAccount`).
    const email = String(intake.owner_email).trim().toLowerCase();
    const ownerPhone = String(intake.owner_phone ?? '').trim();
    const { applicantId, tempPassword } = await resolveApplicantAccount(admin, {
      email,
      ownerFullName: intake.owner_full_name ?? null,
      ownerPhone,
    });

    // The trigger only fires for accounts we just created, so a promotion onto a
    // pre-existing profile (or one created before phone was carried through)
    // would still have no phone. Fill it here, and only when it is empty, so a
    // number the applicant maintains on their account is never clobbered.
    if (ownerPhone) {
      await admin
        .from('profiles')
        .update({ phone: ownerPhone })
        .eq('id', applicantId)
        .is('phone', null);
    }

    // --- Resolve the primary category key → id (optional).
    let primaryCategoryId: string | null = null;
    if (intake.primary_category_key) {
      const { data: cat } = await admin
        .from('service_categories')
        .select('id')
        .eq('key', intake.primary_category_key)
        .maybeSingle();
      primaryCategoryId = cat?.id ?? null;
    }

    // --- Mirror the intake into vendor_applications.
    const { data: app, error: insErr } = await admin
      .from('vendor_applications')
      .insert({
        applicant_id: applicantId,
        business_name: intake.business_name,
        business_location: intake.business_location,
        biography: intake.biography,
        primary_category_id: primaryCategoryId,
        base_city: intake.base_city,
        website: intake.website,
        years_in_operation: intake.years_in_operation,
        business_reg_number: intake.business_reg_number,
        tax_id: intake.tax_id,
        icandy_alumni: !!intake.icandy_alumni,
        pricing_model: intake.pricing_model,
        starting_price: intake.starting_price,
        starting_price_currency: intake.starting_price_currency ?? 'UGX',
        lead_time: intake.lead_time,
        status: 'submitted',
        is_reapplication: false,
        submitted_at: new Date().toISOString(),
        created_by: uid,
      })
      .select('id')
      .single();
    if (insErr || !app) throw new HttpError(400, insErr?.message ?? 'application_insert_failed');

    // --- Claim the intake atomically to prevent a concurrent double-promote
    // from creating a second application/vendor. If the claim finds no row, a
    // parallel request already won — drop our orphan application and return it.
    const { data: claimed } = await admin
      .from('vendor_application_intake')
      .update({ promoted_application_id: app.id })
      .eq('id', intake.id)
      .is('promoted_application_id', null)
      .select('id')
      .maybeSingle();
    if (!claimed) {
      await admin.from('vendor_applications').delete().eq('id', app.id);
      const { data: fresh } = await admin
        .from('vendor_application_intake')
        .select('promoted_application_id')
        .eq('id', intake.id)
        .maybeSingle();
      return json(
        req,
        { applicationId: fresh?.promoted_application_id ?? null, duplicate: true },
        200,
      );
    }

    // --- Approve as the calling admin: creates vendor + trial subscription,
    // grants the vendor role, and sets the application status to 'approved'.
    const { data: vendorId, error: approveErr } = await user.rpc('approve_vendor', {
      p_application_id: app.id,
    });
    if (approveErr) {
      // Approval failed after the account/application were created. Leave the
      // link in place (idempotency guard) and surface the error for retry.
      throw new HttpError(400, `approval_failed:${approveErr.message}`);
    }

    // --- Finalize the intake.
    await admin
      .from('vendor_application_intake')
      .update({ status: 'approved', reviewed_by: uid, reviewed_at: new Date().toISOString() })
      .eq('id', intake.id);

    // --- Welcome the new vendor (best-effort: the vendor already exists, so a
    // mail failure must not fail the promotion — it is reported instead, and an
    // admin can fall back to a password reset).
    const portalUrl = Deno.env.get('VENDOR_PORTAL_URL') ?? PUBLIC_SITE_URL;
    const emailResult = await sendEmail(
      vendorApprovedEmail({
        ownerFullName: String(intake.owner_full_name ?? ''),
        ownerEmail: email,
        businessName: String(intake.business_name ?? ''),
        portalUrl,
        tempPassword,
      }),
    ).catch((e) => ({ sent: false, error: (e as Error).message }));
    if (!emailResult.sent) {
      console.error('[PROMOTE-INTAKE] approval email not delivered:', emailResult.error);
    }

    return json(
      req,
      {
        applicationId: app.id,
        vendorId,
        emailSent: emailResult.sent,
        ...(emailResult.error && { emailWarning: emailResult.error }),
      },
      200,
    );
  }),
);
