import type { ListingCheckKey } from '@/lib/listingCompleteness';
import type { BusinessSectionKey } from './sections';

// The score itself lives in `@/lib/listingCompleteness`, shared with the setup
// wizard so both screens show the same number. This file only knows where on
// the Profile page each gap is fixed.
export { MEANINGFUL_BIO_LENGTH, listingChecks } from '@/lib/listingCompleteness';

/**
 * Where the setup wizard edits verification documents. The Profile page only
 * reports them, so a proof-of-work gap has to be fixed there, not in a section.
 * `returnTo` brings the vendor back to the verification summary afterwards.
 */
export const VERIFICATION_EDIT_HREF =
  '/getting-started?step=verification&returnTo=' +
  encodeURIComponent('/profile?section=verification');

/** Where each check is fixed: a section on this page, or a route when it can't be. */
export const LISTING_CHECK_TARGETS: Record<
  ListingCheckKey,
  { section: BusinessSectionKey } | { href: string }
> = {
  logo: { section: 'logo' },
  bio: { section: 'basics' },
  city: { section: 'basics' },
  location: { section: 'operations' },
  years: { section: 'operations' },
  lead: { section: 'operations' },
  pricing: { section: 'pricing' },
  price: { section: 'pricing' },
  presence: { section: 'presence' },
  coverage: { section: 'coverage' },
  proof: { href: VERIFICATION_EDIT_HREF },
};
