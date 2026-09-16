/**
 * The one listing-completeness score in the vendor portal.
 *
 * Shown by the Profile header and the setup wizard alike — two formulas for
 * "how complete is my listing" once had the wizard saying 100% while Profile
 * said 73%. Anything that shows a completeness number reads it from here.
 *
 * Deliberately separate from the onboarding gate: that decides whether the
 * portal unlocks (required fields only), this nudges a vendor toward a listing
 * clients trust, so optional items count. A finished wizard can therefore sit
 * below 100% — that means polish is left, not that anything is blocked.
 */

/** A bio shorter than this rarely tells a client anything a name doesn't. */
export const MEANINGFUL_BIO_LENGTH = 80;

/** The saved vendor columns the score reads. */
export type ListingFields = {
  primary_image_url: string | null;
  biography: string | null;
  base_city: string | null;
  business_location: string | null;
  years_in_operation: string | null;
  lead_time: string | null;
  pricing_model: string | null;
  starting_price: number | null;
  website: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  proof_of_work_path: string | null;
};

export type ListingCheckKey =
  | 'logo'
  | 'bio'
  | 'city'
  | 'location'
  | 'years'
  | 'lead'
  | 'pricing'
  | 'price'
  | 'presence'
  | 'coverage'
  | 'proof';

export type ListingCheck = { key: ListingCheckKey; label: string; done: boolean };

/**
 * What makes a listing worth booking from, weighted equally. Measured against
 * the *saved* record, so the score only moves once a change is actually live.
 */
export function listingChecks(vendor: ListingFields, regionCount: number): ListingCheck[] {
  const has = (value: string | number | null | undefined) =>
    value !== null && value !== undefined && String(value).trim() !== '';

  return [
    { key: 'logo', label: 'Add a logo', done: has(vendor.primary_image_url) },
    {
      key: 'bio',
      label: 'Write a fuller bio',
      done: (vendor.biography?.trim().length ?? 0) >= MEANINGFUL_BIO_LENGTH,
    },
    { key: 'city', label: 'Set your base city', done: has(vendor.base_city) },
    { key: 'location', label: 'Add your location', done: has(vendor.business_location) },
    { key: 'years', label: 'Years in operation', done: has(vendor.years_in_operation) },
    { key: 'lead', label: 'Typical lead time', done: has(vendor.lead_time) },
    { key: 'pricing', label: 'How you price', done: has(vendor.pricing_model) },
    { key: 'price', label: 'Starting price', done: has(vendor.starting_price) },
    {
      key: 'presence',
      label: 'Link a website or social',
      done: [
        vendor.website,
        vendor.instagram_url,
        vendor.tiktok_url,
        vendor.linkedin_url,
        vendor.facebook_url,
      ].some(has),
    },
    { key: 'coverage', label: 'Pick service regions', done: regionCount > 0 },
    { key: 'proof', label: 'Upload proof of work', done: has(vendor.proof_of_work_path) },
  ];
}

/** The same rounding the shared `CompletenessMeter` applies. */
export function listingPercent(checks: ListingCheck[]) {
  if (!checks.length) return 100;
  return Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
}
