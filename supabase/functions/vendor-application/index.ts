// vendor-application — PUBLIC (anon-invokable). Accepts a completed vendor
// application from the web-public "Become a vendor" form and persists it to
// `vendor_application_intake` using the service_role (RLS-bypassing) client, so
// the payload is validated here and sensitive fields (bank, national id path)
// are never written via arbitrary client SQL. Files are uploaded separately by
// the browser into the private `application-intake` bucket; this function only
// stores their paths/urls. No account required to apply.
//
// BOT PROTECTION
// "No account required" is exactly what makes this worth spamming: every accepted
// submission lands in a reviewer's queue and fires two emails. A Cloudflare
// Turnstile token from the registration form is redeemed before any of that —
// see `_shared/turnstile.ts`. Requires TURNSTILE_SECRET in the environment.
//
// DUPLICATE SUBMISSIONS
// The only de-duplication here used to be on `submission_ref`, which the form
// mints once per PAGE VIEW — it stops a double-click and nothing else. An
// applicant who reloaded and applied again filed a second, independent row, and
// the review queue had no way to tell three submissions from one business apart
// from three separate businesses. That is not hypothetical: it put two live
// vendors and two trial subscriptions on one owner, and locked them out of the
// vendor portal (see `20260930000002_one_vendor_per_owner.sql`).
//
// So `owner_email` is now the identity this endpoint de-duplicates on:
//   • already an approved intake, or already a live vendor → REFUSED (409).
//     Approval provisions an account, a vendor and a subscription; a second
//     pass at that is never what the applicant means, and the honest answer is
//     to send them to support or to their portal.
//   • an earlier submission still pending → the new one SUPERSEDES it. Fixing a
//     typo by applying again is a reasonable thing to do, and it is what the
//     applicant in the incident above was trying to do. The newest submission
//     is the one the applicant stands behind, so it wins and the older rows
//     move to 'withdrawn' — kept, linked, and out of the reviewer's queue.
import { handler, json } from '../_shared/http.ts';
import { adminClient, HttpError } from '../_shared/supabase.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email.ts';
import { requireCaptcha } from '../_shared/turnstile.ts';
import { applicantConfirmationEmail, internalNotificationEmail } from './emails.ts';

const YEARS = ['lt_1y', '1_3y', '3_5y', '5_10y', '10y_plus'];
const PRICING = ['fixed', 'hourly', 'custom', 'combination'];
const LEAD = ['same_week', '1_2_weeks', '2_4_weeks', '1_3_months', '3_plus_months'];
const APPLICANT = ['individual', 'registered_business'];

/** Canonical wording, used when the browser did not send its own copy. */
const MARKETING_CONSENT_FALLBACK =
  'I would like to receive Sinnapi vendor updates, business tips and platform news by email.';

type Referee = {
  fullName?: string;
  phone?: string;
  email?: string;
  eventWorkedOn?: string;
  eventDate?: string;
};

type Body = {
  submissionRef?: string;
  businessName?: string;
  applicantType?: string;
  biography?: string;
  businessLocation?: string;
  baseCity?: string;
  yearsInOperation?: string;
  website?: string;
  primaryCategoryKey?: string;
  serviceCategoryKeys?: string[];
  pricingModel?: string;
  startingPrice?: number | string;
  startingPriceCurrency?: string;
  leadTime?: string;
  serviceRegionKeys?: string[];
  icandyAlumni?: boolean;
  ownerFullName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  profileImageUrl?: string;
  primaryImageUrl?: string;
  galleryImageUrls?: string[];
  videoUrls?: string[];
  instagramUrl?: string;
  tiktokUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  nationalIdPath?: string;
  proofOfWorkPath?: string;
  businessRegNumber?: string;
  taxId?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
  referees?: Referee[];
  acceptedInfoAccuracy?: boolean;
  acceptedVendorTerms?: boolean;
  acceptedEscrowPolicy?: boolean;
  acceptedFalseInfoRemoval?: boolean;
  /**
   * Newsletter opt-in. Optional and separate from the four required terms
   * above — GDPR Art.7(2) requires consent to be "clearly distinguishable from
   * the other matters", so it must never be bundled into an acceptance the
   * applicant has to give in order to proceed.
   */
  marketingConsent?: boolean;
  /** The exact sentence shown beside the checkbox, kept as Art.7(1) evidence. */
  marketingConsentText?: string;
  /** Turnstile token from the registration form. */
  captchaToken?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The only columns the duplicate guard reads off an earlier submission. */
type PriorIntake = { id: string; status: string };

/** Statuses that mean "a reviewer has not decided on this submission yet". */
const PENDING_STATUSES = ['submitted', 'reviewing'];

/**
 * Refuse an applicant who is already onboarded, and report which of their
 * earlier submissions are still pending so the caller can supersede them.
 *
 * Read-only and refusal-only: it never writes, so it is safe to run before the
 * insert and its 409s cost the applicant nothing.
 *
 * Throws 409 `already_approved` when an intake for this address has been
 * approved, and 409 `already_a_vendor` when the address owns a live vendor.
 * Both mean the same thing to the applicant — you are already in — but they are
 * distinguished because the second can be true with no intake behind it at all
 * (the legacy import, or staff onboarding a vendor directly), and support needs
 * to know which path put them there.
 */
async function assertNotAlreadyOnboarded(
  supa: SupabaseClient,
  ownerEmail: string,
): Promise<string[]> {
  // `owner_email` is citext, so this matches however they capitalised it.
  const { data: priorIntakes, error: priorErr } = await supa
    .from('vendor_application_intake')
    .select('id, status')
    .eq('owner_email', ownerEmail)
    .in('status', [...PENDING_STATUSES, 'approved']);
  if (priorErr) throw new HttpError(400, priorErr.message);

  const prior = (priorIntakes ?? []) as PriorIntake[];
  if (prior.some((r) => r.status === 'approved')) throw new HttpError(409, 'already_approved');

  // A live vendor with no intake behind it must be refused too, or approval
  // would later trip the one-live-vendor-per-owner index and reach the reviewer
  // as an opaque constraint error instead of the applicant as a clear message.
  const { data: ownerProfile, error: ownerErr } = await supa
    .from('profiles')
    .select('id')
    .eq('email', ownerEmail)
    .limit(1)
    .maybeSingle();
  if (ownerErr) throw new HttpError(400, ownerErr.message);

  if (ownerProfile) {
    const { data: liveVendor, error: vendorErr } = await supa
      .from('vendors')
      .select('id')
      .eq('owner_id', ownerProfile.id)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    if (vendorErr) throw new HttpError(400, vendorErr.message);
    if (liveVendor) throw new HttpError(409, 'already_a_vendor');
  }

  return prior.filter((r) => PENDING_STATUSES.includes(r.status)).map((r) => r.id);
}

/**
 * Move the applicant's earlier pending submissions to 'withdrawn', pointing each
 * at the one that replaced it. Returns how many were actually retired.
 *
 * Never throws: the replacement application is already committed by the time
 * this runs, and failing the request would tell the applicant their submission
 * did not land when it did. A leftover duplicate is a reviewer seeing two rows —
 * the status quo before this guard existed, and fixable by hand — so a failure
 * is logged loudly and swallowed.
 */
async function supersedePending(
  supa: SupabaseClient,
  candidateIds: string[],
  replacementId: string,
  replacementCreatedAt: string,
): Promise<number> {
  if (candidateIds.length === 0) return 0;

  const { data, error } = await supa
    .from('vendor_application_intake')
    .update({
      status: 'withdrawn',
      superseded_by_intake_id: replacementId,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', candidateIds)
    // Re-asserted as a conditional update: a reviewer who decided on one of
    // these rows between the read and this write keeps their decision. An
    // admin's judgement outranks the applicant's re-submission.
    .in('status', PENDING_STATUSES)
    // Only rows strictly older than the replacement. Two submissions racing each
    // other therefore cannot withdraw one another and leave the applicant with
    // nothing in the queue — the newest survives whatever the interleaving.
    .lt('created_at', replacementCreatedAt)
    .select('id');

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'intake_supersede_failed',
        detail: error.message,
        replacementId,
        candidateIds,
      }),
    );
    return 0;
  }
  return data?.length ?? 0;
}

function req(cond: boolean, field: string) {
  if (!cond) throw new HttpError(422, `missing_or_invalid:${field}`);
}

function clean(v?: string): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Parse an internal-recipient env value into addresses.
 *
 * A team inbox is rarely one mailbox, so this accepts a list separated by
 * commas or semicolons: `ops@sinnapi.com, review@sinnapi.com`. Semicolons are
 * allowed because a list copied out of Outlook uses them, and that is the
 * likeliest way this secret gets set wrong. Entries that are not
 * address-shaped are dropped rather than handed to SMTP, so one typo in the
 * list cannot make the whole notification bounce.
 */
function parseRecipients(v?: string): string[] {
  return (v ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s));
}

Deno.serve(
  handler(async (request) => {
    if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const b = (await request.json().catch(() => null)) as Body | null;
    if (!b) throw new HttpError(400, 'invalid_json');

    // Before validation, not after: a rejected application should cost the
    // caller a solved challenge, and field-level error messages are a map of
    // the schema that only a verified human has any business reading.
    await requireCaptcha(request, b.captchaToken);

    // --- Required-field validation (mirrors the client zod schema) ---
    req(!!b.submissionRef && UUID_RE.test(b.submissionRef), 'submissionRef');
    req(!!clean(b.businessName), 'businessName');
    req(!!b.applicantType && APPLICANT.includes(b.applicantType), 'applicantType');
    req(!!clean(b.ownerFullName), 'ownerFullName');
    req(
      !!clean(b.ownerEmail) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.ownerEmail!.trim()),
      'ownerEmail',
    );
    req(!!clean(b.ownerPhone), 'ownerPhone');
    req(
      Array.isArray(b.serviceCategoryKeys) && b.serviceCategoryKeys.length > 0,
      'serviceCategoryKeys',
    );
    // Service regions, identity documents and payout details are no longer
    // required: the application is one short step, identity is checked during
    // review, and coverage is set from the vendor portal after approval. The
    // columns remain, and are still stored when a caller sends them.

    // Enum fields, when present, must be valid.
    if (b.yearsInOperation) req(YEARS.includes(b.yearsInOperation), 'yearsInOperation');
    if (b.pricingModel) req(PRICING.includes(b.pricingModel), 'pricingModel');
    if (b.leadTime) req(LEAD.includes(b.leadTime), 'leadTime');

    // All four terms must be accepted.
    req(
      !!(
        b.acceptedInfoAccuracy &&
        b.acceptedVendorTerms &&
        b.acceptedEscrowPolicy &&
        b.acceptedFalseInfoRemoval
      ),
      'terms',
    );

    const price =
      b.startingPrice === undefined || b.startingPrice === '' || b.startingPrice === null
        ? null
        : Number(b.startingPrice);
    if (price !== null) req(Number.isFinite(price) && price >= 0, 'startingPrice');

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const userAgent = request.headers.get('user-agent') ?? null;

    const supa = adminClient();
    const ownerEmail = b.ownerEmail!.trim().toLowerCase();

    // Guard against duplicate submits of the same client-generated ref. This
    // stays first and stays cheap: a double-click must be idempotent, not a
    // refusal, and it must not consume the supersede logic below.
    const { data: existing } = await supa
      .from('vendor_application_intake')
      .select('id')
      .eq('submission_ref', b.submissionRef)
      .maybeSingle();
    if (existing) return json(request, { id: existing.id, duplicate: true }, 200);

    // --- Duplicate guard, part 1: is this applicant already through? -------
    // Refuses outright, so it runs before anything is written.
    const priorPendingIds = await assertNotAlreadyOnboarded(supa, ownerEmail);

    const { data, error } = await supa
      .from('vendor_application_intake')
      .insert({
        submission_ref: b.submissionRef,
        business_name: clean(b.businessName),
        applicant_type: b.applicantType,
        biography: clean(b.biography),
        business_location: clean(b.businessLocation),
        base_city: clean(b.baseCity),
        years_in_operation: b.yearsInOperation ?? null,
        website: clean(b.website),
        primary_category_key: clean(b.primaryCategoryKey),
        service_category_keys: b.serviceCategoryKeys ?? [],
        pricing_model: b.pricingModel ?? null,
        starting_price: price,
        starting_price_currency: clean(b.startingPriceCurrency) ?? 'UGX',
        lead_time: b.leadTime ?? null,
        service_region_keys: b.serviceRegionKeys ?? [],
        icandy_alumni: b.icandyAlumni ?? null,
        owner_full_name: clean(b.ownerFullName),
        owner_email: ownerEmail,
        owner_phone: clean(b.ownerPhone),
        profile_image_url: clean(b.profileImageUrl),
        primary_image_url: clean(b.primaryImageUrl),
        gallery_image_urls: b.galleryImageUrls ?? [],
        video_urls: b.videoUrls ?? [],
        instagram_url: clean(b.instagramUrl),
        tiktok_url: clean(b.tiktokUrl),
        linkedin_url: clean(b.linkedinUrl),
        facebook_url: clean(b.facebookUrl),
        national_id_path: clean(b.nationalIdPath),
        proof_of_work_path: clean(b.proofOfWorkPath),
        business_reg_number: clean(b.businessRegNumber),
        tax_id: clean(b.taxId),
        bank_name: clean(b.bankName),
        account_name: clean(b.accountName),
        account_number: clean(b.accountNumber),
        branch: clean(b.branch),
        referees: Array.isArray(b.referees) ? b.referees : [],
        accepted_info_accuracy: !!b.acceptedInfoAccuracy,
        accepted_vendor_terms: !!b.acceptedVendorTerms,
        accepted_escrow_policy: !!b.acceptedEscrowPolicy,
        accepted_false_info_removal: !!b.acceptedFalseInfoRemoval,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select('id, created_at')
      .single();

    if (error) throw new HttpError(400, error.message);

    // --- Duplicate guard, part 2: retire the submissions this one replaces ---
    // After the insert, because the withdrawn rows point at their replacement
    // and that id does not exist until now.
    const supersededCount = await supersedePending(supa, priorPendingIds, data.id, data.created_at);

    // --- Confirmation + internal notification emails (best-effort) ---
    // The application is already persisted, so email failure must NOT fail the
    // request — we surface the outcome in the response and log any error.
    const summary = {
      ownerFullName: clean(b.ownerFullName)!,
      ownerEmail,
      businessName: clean(b.businessName)!,
      submissionRef: b.submissionRef!,
      // Tells the applicant, in the email they actually read, that this
      // submission replaced their earlier one — the single question the
      // incident that prompted this guard left unanswered for everybody.
      replacesEarlier: supersededCount > 0,
    };

    // --- Newsletter opt-in (single, with the full evidence set) -------------
    //
    // Single opt-in rather than the double opt-in used for client sign-up. A
    // vendor application is a commercial onboarding by a business that is
    // already in an operational email relationship with us, and control of the
    // address is proved later anyway — approval mails credentials to it. What
    // makes single opt-in defensible here is the record: the exact wording, the
    // IP, the user agent and the timestamp all land on the subscription row.
    //
    // Best-effort for the same reason as everything else past this point: the
    // application is persisted, and an optional checkbox must not fail it.
    if (b.marketingConsent === true) {
      const { error: consentErr } = await supa.rpc('marketing_capture_consent', {
        p_email: ownerEmail,
        p_topic: 'vendor_updates',
        p_source: 'vendor_application',
        p_consent_text: String(b.marketingConsentText ?? MARKETING_CONSENT_FALLBACK).slice(0, 500),
        p_ip: ip,
        p_user_agent: userAgent,
        p_double_opt_in: false,
      });
      if (consentErr) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'marketing_consent_failed',
            detail: consentErr.message,
          }),
        );
      }
    }

    // Who on the team hears about a new application. Unset means the applicant
    // still gets their confirmation and the row is still recorded — only the
    // internal copy is skipped — so this is a notification setting, never a
    // gate on the submission itself.
    const internalInbox = parseRecipients(Deno.env.get('VENDOR_APPLICATIONS_INBOX'));

    const [applicantResult, internalResult] = await Promise.all([
      sendEmail(applicantConfirmationEmail(summary)),
      internalInbox.length > 0
        ? sendEmail(internalNotificationEmail(internalInbox, summary))
        : Promise.resolve({ sent: false, error: 'internal_inbox_not_configured' }),
    ]).catch((e) => {
      // Promise.all itself shouldn't reject (sendEmail never throws), but guard.
      const detail = (e as Error).message;
      console.error('[VENDOR-APP] email dispatch error:', detail);
      return [
        { sent: false, error: detail },
        { sent: false, error: detail },
      ] as const;
    });

    // The applicant's own confirmation is reported back to the browser; the
    // internal copy is not. Without this line a misconfigured inbox surfaces
    // only as "nobody ever reviewed that application", so say it out loud in
    // the function logs where it can be found.
    if (!internalResult.sent) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'internal_notification_not_sent',
          detail: internalResult.error ?? 'unknown',
          submissionRef: summary.submissionRef,
          recipients: internalInbox.length,
        }),
      );
    }

    return json(
      request,
      {
        id: data.id,
        supersededCount,
        emailSent: applicantResult.sent,
        ...(applicantResult.error && { emailWarning: applicantResult.error }),
      },
      201,
    );
  }),
);
