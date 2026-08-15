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
  /** When the event was marked as under way. Null until either party starts it. */
  started_at: string | null;
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

/** One priced line of a quote. Absent on a quote the vendor has not built yet. */
export type QuotationItemModel = {
  id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
  sort_order: number | null;
};

// useQuotation selects '*' plus the vendor, the line items and the linked event.
export type QuotationDetailModel = {
  id: string;
  reference_no: string | null;
  status: string;
  currency: string | null;
  subtotal: number | null;
  discount_total: number | null;
  tax_total: number | null;
  total: number | null;
  valid_until: string | null;
  request_details: string | null;
  version_no: number | null;
  /** Advance schedule the vendor proposed with the quote; null until sent. */
  advance_rate: number | null;
  advance_release_days_before: number | null;
  advance_terms_note: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  vendor_id: string | null;
  event_id: string | null;
  vendors: VendorRefModel | VendorRefModel[] | null;
  quotation_items: QuotationItemModel[] | null;
  events: EventRefModel | EventRefModel[] | null;
};

export type EventRefModel = {
  id: string;
  title: string | null;
  event_date: string | null;
};

/**
 * One entry of a quotation's status trail. Written by a trigger on insert and
 * on every status change, so a quotation always has at least its `requested`
 * row. `from_status` is null on that first entry; `reason` carries the note the
 * acting party gave when they voided, declined or asked for a revision.
 */
export type QuotationStatusEventModel = {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  occurred_at: string;
};

// ---------- Events ----------
export type MyEventModel = {
  id: string;
  title: string;
  /**
   * The managed occasion behind `event_type_id`, embedded via
   * `event_type:event_types(key,name)`. `name` is what a card renders; `key` is
   * the token the public site and vendor feed filter by.
   */
  event_type: { key: string; name: string } | null;
  event_date: string | null;
  location: string | null;
  status: string;
  source: string;
};

/**
 * One selectable occasion, from `event_types`. Only active types are ever
 * offered to a client — a retired occasion is one nobody should be able to file
 * a new event under.
 */
export type EventTypeOption = { id: string; name: string };

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
  /**
   * The highest advance the client may choose: what the vendor proposed,
   * capped by the platform maximum. Priced alongside the quote so the picker
   * never has to read `platform_settings` to know its own bounds.
   */
  advance_rate_limit: number;
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
/**
 * One row of `get_my_conversations()` (migration 0815f).
 *
 * The counterparty is resolved server-side because `profiles_self_read` stops
 * a client from reading the profile of the person behind a vendor account —
 * so an embedded `conversation_participants(profiles(...))` returns nothing.
 * The old select worked around it with `vendors(business_name)`, which covered
 * `client_vendor` threads only and rendered support threads as the literal
 * string "Client Admin".
 *
 * `last_message_preview` / `last_message_sender_id` are denormalised onto
 * `conversations` by trigger (0815a); before that `last_message_at` was never
 * written at all, so the inbox's own sort was inert.
 */
export type ConversationModel = {
  id: string;
  type: string;
  subject: string | null;
  status: string;
  vendor_id: string | null;
  created_at: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  counterparty_id: string | null;
  counterparty_name: string | null;
  counterparty_avatar_url: string | null;
  unread_count: number;
  last_read_at: string | null;
  is_muted: boolean;
  is_observer: boolean;
};

/** A vendor the client has a booking or quotation with — the "message a vendor" list. */
export type EngagedVendorModel = {
  id: string;
  business_name: string;
  profile_image_url: string | null;
  slug: string | null;
};

export type MessageAttachmentModel = {
  id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  scan_status: string;
};

export type MessageModel = {
  id: string;
  sender_id: string | null;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  is_system: boolean;
  moderation_status: string | null;
  message_attachments: MessageAttachmentModel[] | null;
};

/** One row of `get_conversation_unread()`. */
export type ConversationUnreadModel = {
  conversation_id: string;
  unread_count: number;
  last_read_at: string | null;
  is_muted: boolean;
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
  /**
   * Producer-supplied references — the ids the notification is *about*, which
   * is what lets a row link through to its booking, quote or conversation.
   *
   * Deliberately untyped: three generations of writer fill this column and none
   * agree on a shape. The outbox dispatcher's addressed path writes a reference
   * block (`{booking_id, conversation_id, …, url}`), its legacy path writes
   * `{aggregate, id}`, and the SQL RPCs write their own keys. Consumers must
   * probe — see `recordId()` in `@sinnapi/ui/notifications`.
   */
  data: Record<string, unknown> | null;
  /** `notification_channel` enum — 'in_app' | 'email'. */
  channel: string;
  read_at: string | null;
  created_at: string;
};

/** One page of the notification feed, with the server-exact total beside it. */
export type NotificationPage = {
  rows: NotificationModel[];
  total: number;
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
  /** Account creation timestamp — the "member since" fact on the profile page. */
  created_at: string | null;
};
