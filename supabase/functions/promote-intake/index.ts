// promote-intake — user-invoked (admin with `vendor.approve`). Promotes an
// approved public intake (`vendor_application_intake`) into the auth-bound
// pipeline: provisions an account for the applicant, mirrors the submission
// into `vendor_applications`, then runs the existing `approve_vendor` RPC to
// create the vendor + trial subscription in one step. The intake is linked and
// marked 'approved'.
//
// Why an Edge Function (not a SQL RPC): promotion creates an `auth.users` row
// (only the service_role auth-admin API can do that), while `approve_vendor`
// must run as the calling admin (its `has_permission('vendor.approve')` check
// reads `auth.uid()`). So we combine a service-role client (privileged writes +
// auth admin) with the caller's user-scoped client (for approve_vendor).
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';

type Body = { intakeId?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // --- Resolve the applicant's account: reuse an existing profile by email,
    // otherwise create an auth user (the `handle_new_user` trigger mirrors it
    // into `profiles` and assigns the default role).
    const email = String(intake.owner_email).trim().toLowerCase();
    let applicantId: string;

    const { data: existingProfile, error: profErr } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (profErr) throw new HttpError(400, profErr.message);

    const ownerPhone = String(intake.owner_phone ?? '').trim();

    if (existingProfile) {
      applicantId = existingProfile.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        // `handle_new_user` mirrors full_name + phone into the profile. Phone is
        // NOT set on auth.users: that field is the SMS/OTP identity, is uniquely
        // constrained and expects a confirmation flow.
        user_metadata: { full_name: intake.owner_full_name ?? null, phone: ownerPhone || null },
      });
      if (createErr || !created?.user) {
        throw new HttpError(400, `account_creation_failed:${createErr?.message ?? 'unknown'}`);
      }
      applicantId = created.user.id;
    }

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

    return json(req, { applicationId: app.id, vendorId }, 200);
  }),
);
