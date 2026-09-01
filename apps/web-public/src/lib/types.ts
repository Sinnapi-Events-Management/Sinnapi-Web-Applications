// Minimal public-facing read models (subset of the DB; contacts are NEVER
// exposed on the public site per the approved discovery rules).

/**
 * One choice in a filter dropdown. `value` is the token that travels in the URL
 * and into the RPC; `label` is the only part safe to change freely.
 *
 * Shared rather than per-container because `FacetSelect` renders these for both
 * the vendors and the events grid.
 */
export type FilterOption = { value: string; label: string };

export type VendorCardModel = {
  id: string;
  slug: string;
  business_name: string;
  base_city: string | null;
  biography: string | null;
  primary_image_url: string | null;
  profile_image_url: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
  avg_rating: number;
  review_count: number;
  is_featured: boolean;
};

/**
 * A vendor card enriched with its service categories (primary + everything it
 * sells under), as returned by both `list_featured_vendors_public` and
 * `search_vendors_public`. `categories` is always an array, never null, so
 * callers can map unconditionally.
 */
export type VendorListingModel = VendorCardModel & {
  categories: string[];
};

/** The featured rail's row shape — identical projection, named for its caller. */
export type FeaturedVendorModel = VendorListingModel;

/** Sort orders the public vendor grid offers; mirrors the RPC's whitelist. */
export type VendorSortKey = 'recommended' | 'rating' | 'reviews' | 'price_asc' | 'price_desc';

/**
 * Everything that narrows the public vendor grid. Mirrors `search_vendors_public`
 * one-for-one, and `undefined` means "no constraint" on every field — so a
 * cleared filter set and a first visit produce the same query (and the same
 * cache entry).
 */
export type VendorSearchFilters = {
  q?: string;
  category?: string;
  region?: string;
  priceMin?: number;
  priceMax?: number;
  minRating?: number;
  sort?: VendorSortKey;
};

/** One page of the vendor grid, plus the true size of the filtered set. */
export type VendorSearchPage = {
  vendors: VendorListingModel[];
  total: number;
  /** Offset this page was read from — the cursor `getNextPageParam` advances. */
  offset: number;
};

/**
 * Result counts per filter option, keyed by the option's `key`. Each facet
 * ignores its own current selection, so the numbers answer "what would I get if
 * I picked this" — see `count_vendor_facets_public`. A key that is absent means
 * zero matches.
 */
export type VendorFacetCounts = {
  category: Record<string, number>;
  region: Record<string, number>;
};

export type VendorDetailModel = VendorCardModel & {
  website: string | null;
  pricing_model: string | null;
  lead_time: string | null;
  years_in_operation: string | null;
};

export type VendorMediaModel = {
  id: string;
  media_type: 'image' | 'video';
  url: string | null;
  caption: string | null;
};

export type EventCardModel = {
  id: string;
  title: string;
  description: string | null;
  /**
   * The occasion's key (`event_types.key`) — the snake_case token the URL, the
   * query keys and the facet counts are built from. Stays the identifier, never
   * the copy: an admin renaming an occasion must not invalidate a bookmark.
   */
  event_type: string | null;
  /** The occasion as an admin named it, and the only thing worth rendering. */
  event_type_name: string | null;
  event_date: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  cover_image_url: string | null;
  source: 'admin' | 'client';
};

/** Sort orders the public events grid offers; mirrors the RPC's whitelist. */
export type EventSortKey = 'soonest' | 'newest' | 'budget_asc' | 'budget_desc';

/**
 * Everything that narrows the public events grid. Mirrors `search_events_public`
 * one-for-one, and `undefined` means "no constraint" on every field — so a
 * cleared filter set and a first visit produce the same query (and the same
 * cache entry).
 *
 * Note the asymmetry with the budget bounds, and it is deliberate: budgets are
 * resolved to numbers before they get here, but `when` stays the band token
 * ('upcoming', 'this_month') and is resolved against `current_date` inside the
 * RPC. A date resolved in the browser would put a moving value in the query key,
 * so a server prefetch and the client that hydrates it could disagree about
 * "today" and refetch the entire grid for nothing.
 */
export type EventSearchFilters = {
  q?: string;
  type?: string;
  source?: string;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  when?: string;
  sort?: EventSortKey;
};

/** One page of the events grid, plus the true size of the filtered set. */
export type EventSearchPage = {
  events: EventCardModel[];
  total: number;
  /** Offset this page was read from — the cursor `getNextPageParam` advances. */
  offset: number;
};

/**
 * Result counts per filter option, keyed by the option's `value`. Each facet
 * ignores its own current selection, so the numbers answer "what would I get if
 * I picked this" — see `count_event_facets_public`. A key that is absent means
 * zero matches.
 *
 * Budget is absent by design: it is a continuous range rather than a discrete
 * key, so the RPC does not count it (same call the vendor search makes for
 * price and rating).
 */
export type EventFacetCounts = {
  type: Record<string, number>;
  source: Record<string, number>;
  location: Record<string, number>;
  when: Record<string, number>;
};

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

/** How a vendor is billed. Mirrors the `billing_cycle` enum. */
export type BillingCycle = 'monthly' | 'annual';

/**
 * One subscription tier as the public pricing page sees it — both billing
 * cycles resolved onto a single object by `list_pricing_plans_public`, because
 * the DB stores a row per (key, cycle) while the card is one tier with a
 * toggle.
 *
 * Every price is nullable, and that carries meaning rather than being defensive:
 * a tier the admin has only priced monthly returns null annual figures, which
 * the page reads as "no yearly option here" instead of rendering a blank number.
 *
 * `price_annual` is what the vendor is charged once a year; `price_annual_monthly`
 * is that figure ÷ 12, which is what the card advertises. Keep using the derived
 * one for display — see the units note in the migration.
 */
export type PricingPlanModel = {
  key: string;
  name: string;
  tagline: string | null;
  description: string | null;
  highlight: boolean;
  sort_order: number;
  currency: string;
  trial_days: number;
  features: string[];
  price_monthly: number | null;
  price_annual: number | null;
  price_annual_monthly: number | null;
};

/**
 * A structured capability flag from `plan_features`, still in its raw form:
 * `true`, `10`, `-1` (meaning unlimited) or a token like `"top_tier"`. Turning
 * those into cells is the comparison table's job — see its feature catalogue.
 */
export type PlanFeatureValue = boolean | number | string;

export type PlanFeatureModel = {
  plan_key: string;
  feature_key: string;
  value: PlanFeatureValue;
};

/**
 * A vendor's published package, as an unauthenticated visitor reads one.
 *
 * Anon reaches these rows through the `qtpl_read` policy, which returns only
 * packages that are public, active, not taken down by a moderator, and whose
 * vendor is themselves public. Nothing is redacted beyond that: published
 * packages are itemised in public by design, which is what lets this page show
 * a real price instead of "contact for pricing".
 *
 * The field names are the column names because that is what PostgREST returns
 * and because `@sinnapi/ui`'s `QuotePackageLike` is defined against them.
 */
export type PackageLineModel = {
  id: string;
  tier_id: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  unit_label: string | null;
  notes: string | null;
  is_optional: boolean | null;
  sort_order: number | null;
};

export type PackageTierModel = {
  id: string;
  name: string;
  description: string | null;
  is_recommended: boolean | null;
  discount_rate: number | string | null;
  sort_order: number | null;
  quote_template_items: PackageLineModel[] | null;
};

export type PackageModel = {
  id: string;
  vendor_id: string;
  name: string;
  summary: string | null;
  notes: string | null;
  currency: string | null;
  cover_image_url: string | null;
  vendor_service_id: string | null;
  category_id: string | null;
  /** How this package is charged — null on any published before 0823c. */
  pricing_model: string | null;
  inclusions: string[] | null;
  exclusions: string[] | null;
  lead_time_days: number | null;
  tax_rate: number | string | null;
  tax_inclusive: boolean | null;
  valid_days: number | null;
  advance_rate: number | string | null;
  advance_release_days_before: number | null;
  advance_terms_note: string | null;
  visibility: 'private' | 'public' | null;
  is_active: boolean | null;
  published_at: string | null;
  sort_order: number | null;
  quote_template_tiers: PackageTierModel[] | null;
  /** Only the shared add-ons: the read scopes this with `tier_id=is.null`. */
  quote_template_items: PackageLineModel[] | null;
};

/**
 * One live offer a vendor is running, from `vendor_offers`.
 *
 * `code` is always null here and the type says so with a comment rather than
 * `never`: the RPC redacts it for a caller with no session, and every caller in
 * this app is the anon client. Keeping the field means the same component
 * renders this row and the client portal's — where a code IS present — without
 * two types describing one shape.
 */
export type PublicVendorOfferModel = {
  discount_id: string;
  promotion_id: string | null;
  promotion_title: string | null;
  banner_url: string | null;
  title: string;
  description: string | null;
  terms: string | null;
  /** Always null on this site. Sign-in is what reveals it. */
  code: string | null;
  is_automatic: boolean | null;
  type: string;
  value: number;
  currency: string | null;
  max_discount_amount: number | null;
  min_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  remaining_uses: number | null;
  package_ids: string[] | null;
  package_names: string[] | null;
};

/** One card of the public offers directory, from `search_public_offers`. */
export type PublicOfferModel = PublicVendorOfferModel & {
  vendor_id: string;
  vendor_name: string;
  vendor_slug: string;
  vendor_image_url: string | null;
  vendor_rating: number | null;
  vendor_review_count: number | null;
  category_id: string | null;
  category_name: string | null;
  promotion_public_id: string | null;
  /** Placed at the top of the directory by an operator. */
  is_featured: boolean | null;
  package_count: number | null;
  /** The cheapest tier this offer touches, before the offer is applied. */
  from_price: number | null;
  /** Repeated on every row — the RPC counts and pages in one scan. */
  total_count: number | null;
};

/** A service category with both identifiers: the key for URLs, the id for RPCs. */
export type CategoryOption = { id: string; key: string; name: string };
