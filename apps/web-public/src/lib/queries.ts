import { createAnonClient as createPublicClient } from './supabase/anon';
import { EVENT_LOCATIONS } from './config/site';
import type {
  VendorCardModel,
  VendorDetailModel,
  VendorMediaModel,
  EventCardModel,
  FeaturedVendorModel,
  VendorListingModel,
  VendorSearchFilters,
  VendorSearchPage,
  VendorFacetCounts,
  EventSearchFilters,
  EventSearchPage,
  EventFacetCounts,
  PublicReview,
  PricingPlanModel,
  PlanFeatureModel,
} from './types';

// Public columns only — vendor email/phone are intentionally excluded everywhere.
const VENDOR_CARD_COLS =
  'id,slug,business_name,base_city,biography,primary_image_url,profile_image_url,starting_price,starting_price_currency,avg_rating,review_count,is_featured';

export type VendorFilters = {
  category?: string;
  region?: string;
  q?: string;
  minRating?: number;
};

export async function getVendors(
  filters: VendorFilters = {},
  limit = 24,
): Promise<VendorCardModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  let query = supa
    .from('vendors')
    .select(VENDOR_CARD_COLS)
    .eq('status', 'active')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('search_weight', { ascending: false })
    .order('avg_rating', { ascending: false })
    .limit(limit);

  if (filters.minRating) query = query.gte('avg_rating', filters.minRating);
  if (filters.q) query = query.ilike('business_name', `%${filters.q}%`);
  // category / region filtering go through join tables; kept simple here.

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as VendorCardModel[];
}

export async function getVendorBySlug(slug: string): Promise<VendorDetailModel | null> {
  const supa = createPublicClient();
  if (!supa) return null;
  const { data } = await supa
    .from('vendors')
    .select(`${VENDOR_CARD_COLS},website,pricing_model,lead_time,years_in_operation`)
    .eq('slug', slug)
    .eq('status', 'active')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .maybeSingle();
  return (data as VendorDetailModel) ?? null;
}

export async function getVendorMedia(vendorId: string): Promise<VendorMediaModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('vendor_media')
    .select('id,media_type,url,caption')
    .eq('vendor_id', vendorId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });
  return (data ?? []) as VendorMediaModel[];
}

export async function getVendorReviews(vendorId: string, limit = 20): Promise<PublicReview[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('reviews')
    .select('id,rating,title,body,created_at')
    .eq('vendor_id', vendorId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as PublicReview[];
}

export async function getAllVendorSlugs(): Promise<string[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('vendors')
    .select('slug')
    .eq('status', 'active')
    .eq('visibility', 'public')
    .is('deleted_at', null);
  return (data ?? []).map((v: { slug: string }) => v.slug);
}

export async function getEvents(limit = 24): Promise<EventCardModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('events')
    .select(
      'id,title,description,event_type,event_date,location,budget_min,budget_max,currency,cover_image_url,source',
    )
    .eq('status', 'published')
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('event_date', { ascending: false })
    .limit(limit);
  return (data ?? []) as EventCardModel[];
}

export async function getEventById(id: string): Promise<EventCardModel | null> {
  const supa = createPublicClient();
  if (!supa) return null;
  const { data } = await supa
    .from('events')
    .select(
      'id,title,description,event_type,event_date,location,budget_min,budget_max,currency,cover_image_url,source',
    )
    .eq('id', id)
    .eq('status', 'published')
    .eq('is_public', true)
    .is('deleted_at', null)
    .maybeSingle();
  return (data as EventCardModel) ?? null;
}

/** {key,name} pairs for a reference lookup (categories/regions). */
export type ReferenceOption = { key: string; name: string };

/** Service categories (public read) — powers the vendor application form. */
export async function getServiceCategories(): Promise<ReferenceOption[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('service_categories')
    .select('key,name')
    .order('sort_order', { ascending: true });
  return (data ?? []) as ReferenceOption[];
}

/** Service regions (public read) — powers the vendor application form. */
export async function getServiceRegions(): Promise<ReferenceOption[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('service_regions')
    .select('key,name')
    .order('sort_order', { ascending: true });
  return (data ?? []) as ReferenceOption[];
}

// =====================================================================
// RPC-backed reads
// Server-side functions (see supabase/migrations/20260722000001_public_home_rpc.sql)
// that own their own projection, ordering and limit clamping. Preferred over the
// table selects above wherever a read needs joined data or a ranking rule the
// client shouldn't be restating.
// =====================================================================

/**
 * Featured vendors for the home spotlight rail, with their service categories
 * joined server-side. Ordering (editorial weight → rating → reviews) lives in
 * the function, so every surface that shows featured vendors ranks identically.
 */
export async function listFeaturedVendors(limit = 24): Promise<FeaturedVendorModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data, error } = await supa.rpc('list_featured_vendors_public', { p_limit: limit });
  if (error) return [];
  return (data ?? []) as FeaturedVendorModel[];
}

/**
 * Published public events, upcoming-soonest first. Same feed the /events page
 * shows, trimmed to whatever the caller can display.
 */
export async function listPublicEvents(limit = 6): Promise<EventCardModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data, error } = await supa.rpc('list_public_events', { p_limit: limit });
  if (error) return [];
  return (data ?? []) as EventCardModel[];
}

/** How many cards the vendor grid pulls per page. The RPC clamps above 48. */
export const VENDOR_PAGE_SIZE = 24;

/** Maps our camelCase filter object onto the RPC's `p_`-prefixed arguments. */
function toVendorRpcArgs(filters: VendorSearchFilters) {
  return {
    p_q: filters.q ?? null,
    p_category: filters.category ?? null,
    p_region: filters.region ?? null,
    p_price_min: filters.priceMin ?? null,
    p_price_max: filters.priceMax ?? null,
    p_min_rating: filters.minRating ?? null,
  };
}

/** A `search_vendors_public` row: the listing model plus the window count. */
type VendorSearchRow = VendorListingModel & { total_count: number };

/**
 * One page of the public vendor grid. Search, facets, sorting and paging all
 * resolve inside `search_vendors_public`, so this is a single round trip over
 * the whole marketplace rather than a slice narrowed after the fact.
 *
 * Isomorphic by design: the server prefetches page 0 for the first paint and
 * the browser fetches every page after it through this exact function, which is
 * what lets TanStack Query hydrate the server's result instead of refetching it.
 *
 * `total` rides on every row as a window count, so an empty page legitimately
 * reports 0 — there is no separate count query to fall out of sync.
 *
 * A failed request throws rather than resolving to an empty page. Returning
 * `{ vendors: [], total: 0 }` made every caller read a network failure as "the
 * marketplace is empty": the grid's `isError` could never become true, so its
 * error state and Try again button were unreachable and a dropped connection
 * rendered as "No vendors listed yet". Throwing is also what lets TanStack Query
 * retry, and what stops the ISR category/region pages from prerendering — and
 * getting indexed as — empty listings. A revalidation that throws keeps serving
 * the last good page.
 *
 * Missing env is different and still degrades quietly: that is a deployment
 * without Supabase configured, not a request that failed.
 */
export async function searchPublicVendors(
  filters: VendorSearchFilters = {},
  { offset = 0, limit = VENDOR_PAGE_SIZE, excludeFeatured = false } = {},
): Promise<VendorSearchPage> {
  const supa = createPublicClient();
  if (!supa) return { vendors: [], total: 0, offset };

  const { data, error } = await supa.rpc('search_vendors_public', {
    ...toVendorRpcArgs(filters),
    p_sort: filters.sort ?? 'recommended',
    p_exclude_featured: excludeFeatured,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = (data ?? []) as VendorSearchRow[];
  return {
    // Strip the window count so the card model stays the card model.
    vendors: rows.map(({ total_count: _total, ...vendor }) => vendor),
    total: rows[0]?.total_count ?? 0,
    offset,
  };
}

/**
 * Result counts for every category and region option under the *current*
 * filters, so the filter controls can show "Photographer (24)" and disable the
 * options that lead to an empty grid. Each facet ignores its own selection —
 * see `count_vendor_facets_public`.
 *
 * Absent keys mean zero, so callers should read through `?? 0` rather than
 * expecting an entry per option.
 *
 * Throws on failure, for the same reason the grid does — but the consequence is
 * gentler here: the toolbar treats absent counts as "this facet isn't counted"
 * and renders plain, fully-enabled options, so a counts outage costs the
 * labels rather than the ability to filter.
 */
export async function getVendorFacetCounts(
  filters: VendorSearchFilters = {},
): Promise<VendorFacetCounts> {
  const empty: VendorFacetCounts = { category: {}, region: {} };
  const supa = createPublicClient();
  if (!supa) return empty;

  const { data, error } = await supa.rpc('count_vendor_facets_public', toVendorRpcArgs(filters));
  if (error) throw error;

  return ((data ?? []) as { facet: keyof VendorFacetCounts; key: string; count: number }[]).reduce(
    (acc, row) => {
      if (acc[row.facet]) acc[row.facet][row.key] = Number(row.count);
      return acc;
    },
    { category: {}, region: {} } as VendorFacetCounts,
  );
}

/** How many cards the events grid pulls per page. The RPC clamps above 48. */
export const EVENT_PAGE_SIZE = 24;

/** Maps our camelCase filter object onto the RPC's `p_`-prefixed arguments. */
function toEventRpcArgs(filters: EventSearchFilters) {
  return {
    p_q: filters.q ?? null,
    p_type: filters.type ?? null,
    p_source: filters.source ?? null,
    p_location: filters.location ?? null,
    p_budget_min: filters.budgetMin ?? null,
    p_budget_max: filters.budgetMax ?? null,
    // Sent as the band token, not a date — see `EventSearchFilters`.
    p_when: filters.when ?? null,
  };
}

/** A `search_events_public` row: the card model plus the window count. */
type EventSearchRow = EventCardModel & { total_count: number };

/**
 * One page of the public events grid. Search, facets, sorting and paging all
 * resolve inside `search_events_public`, so this is a single round trip over the
 * whole feed rather than a slice narrowed after the fact — which is what the
 * page did before, and why searching only ever searched the first 24 rows.
 *
 * Isomorphic by design: the server prefetches page 0 for the first paint and the
 * browser fetches every page after it through this exact function, which is what
 * lets TanStack Query hydrate the server's result instead of refetching it.
 *
 * `total` rides on every row as a window count, so an empty page legitimately
 * reports 0 — there is no separate count query to fall out of sync.
 */
export async function searchPublicEvents(
  filters: EventSearchFilters = {},
  { offset = 0, limit = EVENT_PAGE_SIZE } = {},
): Promise<EventSearchPage> {
  const supa = createPublicClient();
  if (!supa) return { events: [], total: 0, offset };

  const { data, error } = await supa.rpc('search_events_public', {
    ...toEventRpcArgs(filters),
    p_sort: filters.sort ?? 'soonest',
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = (data ?? []) as EventSearchRow[];
  return {
    // Strip the window count so the card model stays the card model.
    events: rows.map(({ total_count: _total, ...event }) => event),
    total: rows[0]?.total_count ?? 0,
    offset,
  };
}

/**
 * Result counts for every occasion, source, town and date band under the
 * *current* filters, so the filter controls can show "Wedding (24)" and disable
 * the options that lead to an empty grid. Each facet ignores its own selection —
 * see `count_event_facets_public`.
 *
 * The town list is passed in rather than derived server-side: `events.location`
 * is free text, so the RPC has no discrete keys to group by and counts the
 * curated tokens by containment instead.
 *
 * Absent keys mean zero, so callers should read through `?? 0` rather than
 * expecting an entry per option.
 */
export async function getEventFacetCounts(
  filters: EventSearchFilters = {},
): Promise<EventFacetCounts> {
  const empty: EventFacetCounts = { type: {}, source: {}, location: {}, when: {} };
  const supa = createPublicClient();
  if (!supa) return empty;

  const { data, error } = await supa.rpc('count_event_facets_public', {
    ...toEventRpcArgs(filters),
    p_locations: EVENT_LOCATIONS,
  });
  if (error) throw error;

  return ((data ?? []) as { facet: keyof EventFacetCounts; key: string; count: number }[]).reduce(
    (acc, row) => {
      if (acc[row.facet]) acc[row.facet][row.key] = Number(row.count);
      return acc;
    },
    { type: {}, source: {}, location: {}, when: {} } as EventFacetCounts,
  );
}

/**
 * The live subscription catalogue for the /pricing cards. One object per tier
 * with both billing cycles already resolved, so flipping the billing toggle is
 * a render, not a request.
 *
 * Throws on failure rather than resolving to `[]`, for the same reason the
 * vendors grid does — and the stakes are higher here. A pricing page that
 * silently degrades to "no plans" on a dropped connection is indistinguishable
 * from a business with nothing to sell, and it would make the section's error
 * state unreachable. Throwing also lets TanStack Query retry, and stops an ISR
 * revalidation from replacing a good snapshot with an empty one.
 *
 * Missing env stays quiet, as everywhere else: that is a deployment without
 * Supabase configured, not a request that failed.
 */
export async function listPricingPlans(limit = 12): Promise<PricingPlanModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data, error } = await supa.rpc('list_pricing_plans_public', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as PricingPlanModel[];
}

/**
 * Structured capability flags for every active plan, powering the feature
 * comparison matrix. Flat `(plan_key, feature_key, value)` triples — the table
 * groups and labels them, because that is display, not data.
 */
export async function listPlanFeatures(): Promise<PlanFeatureModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data, error } = await supa.rpc('list_plan_features_public');
  if (error) throw error;
  return (data ?? []) as PlanFeatureModel[];
}
