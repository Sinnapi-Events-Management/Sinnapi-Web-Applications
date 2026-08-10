// Client-portal read models. These describe the shapes returned by the
// queries in src/hooks/queries.ts. The Supabase client is untyped, so each
// query asserts one of these shapes ONCE at the data boundary.

// Embedded (to-one) relations as returned by PostgREST. Use one<T>() at call
// sites to normalize the object-or-array shape.
export type VendorRefModel = {
  business_name: string;
  slug: string | null;
  primary_image_url: string | null;
};

export type VendorNameRefModel = {
  business_name: string;
};

export type VendorNameSlugRefModel = {
  business_name: string;
  slug: string | null;
};

export type BookingRefModel = {
  reference_no: string | null;
};

// ---------- Vendors ----------
export type VendorCardModel = {
  id: string;
  slug: string;
  business_name: string;
  base_city: string | null;
  primary_image_url: string | null;
  profile_image_url: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
  avg_rating: number;
  review_count: number;
  is_featured: boolean;
};

export type VendorDetailModel = VendorCardModel & {
  biography: string | null;
  website: string | null;
  pricing_model: string | null;
  lead_time: string | null;
  years_in_operation: string | null;
};

/**
 * One portfolio item from `vendor_media`. `media_type` is the DB enum, so the
 * two values are exhaustive. `url` is nullable in the table (a row can exist
 * with only a storage path), so anything without one is dropped before render.
 */
export type VendorMediaModel = {
  id: string;
  media_type: 'image' | 'video';
  url: string | null;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
};

/**
 * A row from `search_vendors_public` — the card model plus the categories the
 * vendor sells under. `categories` is the primary category and every active
 * service category, already de-duplicated and alphabetised by the RPC; it is
 * always an array, never null.
 */
export type VendorSearchCardModel = VendorCardModel & {
  biography: string | null;
  categories: string[];
};

/** Orderings `search_vendors_public` whitelists. Anything else falls back server-side. */
export type VendorSortKey =
  | 'recommended'
  | 'rating'
  | 'reviews'
  | 'price_asc'
  | 'price_desc'
  | 'newest';

/**
 * Everything that narrows the discovery grid, in the numeric form the RPC
 * takes. Band tokens ('8m_plus', '4_5') are resolved to these bounds in
 * `pages/discover/schema/filters.ts`, so the grid and the facet counts can
 * never disagree about what a band means.
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

/** One page of the discovery grid, plus the size of the whole filtered set. */
export type VendorSearchPage = {
  vendors: VendorSearchCardModel[];
  total: number;
  offset: number;
};

/**
 * Result counts per facet option under the current filters. Absent keys mean
 * zero — read through `?? 0` rather than expecting an entry per option.
 */
export type VendorFacetCounts = {
  category: Record<string, number>;
  region: Record<string, number>;
};

/** A reference-table row backing a filter dropdown (`service_categories`/`service_regions`). */
export type FilterRefModel = {
  key: string;
  name: string;
};

// ---------- Bookings ----------
export type BookingListModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  amount: number | null;
  currency: string | null;
  vendor_id: string | null;
  vendors: VendorRefModel | VendorRefModel[] | null;
};

// useBooking selects '*' plus the vendors relation.
export type BookingDetailModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  /** Postgres `time` values ("14:00:00"); either end may be absent. */
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  amount: number | null;
  currency: string | null;
  payment_type: string | null;
  /** Advance schedule agreed on the quotation; null on older bookings. */
  advance_rate: number | null;
  advance_release_days_before: number | null;
  advance_terms_note: string | null;
  /** The client's explicit consent — escrow cannot be funded without it. */
  advance_terms_accepted_at: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  created_at: string;
  vendor_id: string | null;
  vendors: VendorRefModel | VendorRefModel[] | null;
};

/**
 * One entry of a booking's status trail. Written by a trigger on insert and on
 * every status change, so a booking always has at least its `requested` row.
 * `from_status` is null on that first entry.
 */
export type BookingStatusEventModel = {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  occurred_at: string;
};

// ---------- Quotations ----------
export type QuotationListModel = {
  id: string;
  reference_no: string | null;
  status: string;
  total: number | null;
  currency: string | null;
  valid_until: string | null;
  created_at: string;
  vendor_id: string | null;
  vendors: VendorNameSlugRefModel | VendorNameSlugRefModel[] | null;
};

// ---------- Events ----------
export type MyEventModel = {
  id: string;
  title: string;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  status: string;
  source: string;
};

// ---------- Escrow / Payments ----------
export type EscrowModel = {
  id: string;
  status: string;
  gross_amount: number | null;
  net_payout_amount: number | null;
  agreed_amount: number | null;
  advance_amount: number | null;
  balance_amount: number | null;
  advance_release_due_at: string | null;
  auto_release_due_at: string | null;
  currency: string | null;
  booking_id: string | null;
  bookings: BookingRefModel | BookingRefModel[] | null;
  vendors: VendorNameRefModel | VendorNameRefModel[] | null;
};

/**
 * The full escrow record behind a booking.
 *
 * Commission and the processing fee are charged on top of the agreed amount,
 * so `gross_amount` (what the client paid) is deliberately larger than
 * `agreed_amount` (what the vendor receives). The two tranches always sum back
 * to the agreed amount.
 */
export type EscrowDetailModel = {
  id: string;
  status: string;
  currency: string | null;
  agreed_amount: number | null;
  commission_rate: number | null;
  commission_amount: number | null;
  psp_fee_rate: number | null;
  psp_fee_amount: number | null;
  gross_amount: number | null;
  advance_rate: number | null;
  advance_amount: number | null;
  balance_amount: number | null;
  advance_release_due_at: string | null;
  advance_released_at: string | null;
  balance_released_at: string | null;
  auto_release_due_at: string | null;
  client_confirmed_at: string | null;
  released_at: string | null;
  timers_frozen_at: string | null;
  failure_reason: string | null;
  attempt_no: number | null;
  booking_id: string | null;
  created_at: string;
};

/**
 * A priced-but-not-yet-charged escrow quote. Returned by the `escrow_price_booking`
 * RPC so the checkout preview and the actual charge come from one calculation.
 */
export type EscrowQuoteModel = {
  agreed_amount: number;
  commission_rate: number;
  commission_amount: number;
  psp_fee_rate: number;
  psp_fee_amount: number;
  gross_amount: number;
  advance_rate: number;
  advance_amount: number;
  balance_amount: number;
  currency: string;
  advance_release_days_before: number;
  advance_release_due_at: string;
};

/** One step of an escrow's append-only history, as the client sees it. */
export type EscrowEventModel = {
  id: string;
  event_type: string;
  amount: number | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
};

/** A tranche paid out to the vendor. Settlement is manual and evidenced. */
export type EscrowPayoutModel = {
  id: string;
  kind: string;
  status: string;
  amount: number | null;
  currency: string | null;
  settlement_method: string | null;
  settlement_reference: string | null;
  settled_at: string | null;
  created_at: string;
};

/** The advance schedule agreed on the quotation and carried to the booking. */
export type AdvanceTermsModel = {
  advance_rate: number | null;
  advance_release_days_before: number | null;
  advance_terms_note: string | null;
  advance_terms_accepted_at: string | null;
};

export type PaymentModel = {
  id: string;
  purpose: string;
  amount: number | null;
  currency: string | null;
  status: string;
  provider: string | null;
  provider_method: string | null;
  paid_at: string | null;
  created_at: string;
};

// ---------- Messaging ----------
export type ConversationModel = {
  id: string;
  type: string;
  subject: string | null;
  last_message_at: string | null;
  status: string;
  vendors: VendorNameRefModel | VendorNameRefModel[] | null;
};

export type MessageModel = {
  id: string;
  sender_id: string | null;
  body: string | null;
  created_at: string;
  moderation_status: string | null;
};

// ---------- Reviews / Notifications / Profile ----------
export type ReviewModel = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string;
  vendors: VendorNameSlugRefModel | VendorNameSlugRefModel[] | null;
};

export type NotificationModel = {
  id: string;
  trigger_key: string;
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export type ProfileModel = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  locale: string | null;
  preferred_currency: string | null;
  mfa_enabled: boolean;
};
