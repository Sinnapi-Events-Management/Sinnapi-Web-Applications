// vendor-application — PUBLIC (anon-invokable). Accepts a completed vendor
// application from the web-public "Become a vendor" form and persists it to
// `vendor_application_intake` using the service_role (RLS-bypassing) client, so
// the payload is validated here and sensitive fields (bank, national id path)
// are never written via arbitrary client SQL. Files are uploaded separately by
// the browser into the private `application-intake` bucket; this function only
// stores their paths/urls. No account required to apply.
import { handler, json } from '../_shared/http.ts';
import { adminClient, HttpError } from '../_shared/supabase.ts';

const YEARS = ['lt_1y', '1_3y', '3_5y', '5_10y', '10y_plus'];
const PRICING = ['fixed', 'hourly', 'custom', 'combination'];
const LEAD = ['same_week', '1_2_weeks', '2_4_weeks', '1_3_months', '3_plus_months'];
const APPLICANT = ['individual', 'registered_business'];

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
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function req(cond: boolean, field: string) {
  if (!cond) throw new HttpError(422, `missing_or_invalid:${field}`);
}

function clean(v?: string): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

Deno.serve(
  handler(async (request) => {
    if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const b = (await request.json().catch(() => null)) as Body | null;
    if (!b) throw new HttpError(400, 'invalid_json');

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
    req(Array.isArray(b.serviceRegionKeys) && b.serviceRegionKeys.length > 0, 'serviceRegionKeys');
    req(!!b.nationalIdPath, 'nationalIdPath');

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

    // Guard against duplicate submits of the same client-generated ref.
    const { data: existing } = await supa
      .from('vendor_application_intake')
      .select('id')
      .eq('submission_ref', b.submissionRef)
      .maybeSingle();
    if (existing) return json(request, { id: existing.id, duplicate: true }, 200);

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
        owner_email: b.ownerEmail!.trim().toLowerCase(),
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
      .select('id')
      .single();

    if (error) throw new HttpError(400, error.message);

    return json(request, { id: data.id }, 201);
  }),
);
