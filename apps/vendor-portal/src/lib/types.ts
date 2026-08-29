// Read models for the vendor portal. The Supabase client is untyped, so query
// results are effectively `any`; we assert these concrete shapes ONCE at the
// query boundary (see src/hooks/queries.ts) so components stay fully typed.
//
// Embedded relations are returned by PostgREST as an object OR an array; such
// fields are typed as `T | T[] | null` and normalized with `one<T>()` (rel.ts).

import type { BookingPaymentWindowFields } from '@sinnapi/ui';

/**
 * A counterparty resolved through `get_profile_directory`, NOT through an
 * embedded relation.
 *
 * `profiles_self_read` lets an account read only its own profile row, so
 * `profiles:client_id(full_name)` embeds returned null for every client this
 * portal has ever displayed. The RPC discloses these fields for people the
 * vendor already shares a quotation, booking or conversation with.
 *
 * `email` and `phone` stay null until the engagement is live — an accepted
 * quote or a booking past `requested` — which is what `contact_visible`
 * reports. Null contact with `contact_visible: false` means "not yet", not
 * "missing", and the UI should say so rather than render a blank field.
 */
export type DirectoryProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  contact_visible: boolean;
};

export type VendorRel = {
  business_name: string | null;
};

export type BookingRel = {
  reference_no: string | null;
};

export type ProfileModel = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_currency: string | null;
  /** Account creation timestamp — the "member since" fact on the profile page. */
  created_at: string | null;
};

export type MyApplicationModel = {
  id: string;
  status: string;
  business_name: string | null;
  is_reapplication: boolean | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type VendorBookingModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  amount: number | null;
  currency: string | null;
  client_id: string | null;
  /** How the client has asked to pay, and whether this vendor has agreed to it.
   *  A request whose terms are unanswered is the one a vendor should open. */
  payment_type: string | null;
  payment_terms_status: string | null;
} & BookingPaymentWindowFields;

/**
 * The booking a client made from a quotation, when there is one. Deliberately
 * thin: the quotation page only needs to say whether the quote has turned into
 * a date the vendor has to answer, and where to click — the booking's own page
 * owns everything else.
 *
 * `ux_bookings_quotation` makes at most one of these exist per quote.
 */
export type QuotationBookingModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
};

/**
 * The quotation a booking was made from, embedded on the booking read.
 *
 * The vendor's own document, coming back to them as the record of what they
 * offered: the header fields, the money columns and the priced lines.
 * `quotations_read` matches on `is_vendor_owner(vendor_id)` and `q_items_rw`
 * follows it to the lines, so this needed no new grant and no RPC.
 *
 * Absent on a booking a client placed straight against a service.
 */
export type BookingQuotationModel = {
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
  advance_rate: number | null;
  advance_release_days_before: number | null;
  advance_terms_note: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string | null;
  quotation_items: QuotationItemModel[] | null;
};

/**
 * The event a booking hangs off, when the vendor is allowed to see it.
 *
 * `events_public_read` discloses an event to a vendor only while it is
 * published and public — which is exactly the marketplace request they quoted
 * on. A booking against a client's private event resolves this to null, and
 * the card is then absent rather than empty: the vendor has the booking's own
 * date and location either way.
 */
export type BookingEventModel = {
  id: string;
  title: string | null;
  event_date: string | null;
  location: string | null;
  payment_type: string | null;
  payment_terms_note: string | null;
};

export type VendorBookingDetailModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  /** Postgres `time` values ("14:00:00"); either end may be absent. */
  start_time: string | null;
  end_time: string | null;
  amount: number | null;
  currency: string | null;
  location: string | null;
  /** The payment rail the client proposed — `escrow` or `direct` (off platform). */
  payment_type: string | null;
  /**
   * How far the terms conversation has got. The vendor's accept agrees to this
   * as well as to the date; their counter offers the other rail back. Read
   * through `readPaymentTerms` rather than compared to string literals here.
   */
  payment_terms_status: string | null;
  payment_terms_counter: string | null;
  payment_terms_note: string | null;
  /** Set on the client's event, so not this vendor's to renegotiate. */
  payment_terms_from_event: boolean | null;
  /**
   * The advance schedule carried over from the quotation, and the client's
   * consent to it. Read-only here — the client owns the rate, and the vendor
   * owns nothing about it — but it is the vendor's money and the date it
   * arrives, which makes it theirs to know.
   */
  advance_rate: number | null;
  advance_release_days_before: number | null;
  advance_terms_note: string | null;
  /** Null until the client accepts. `activate_escrow` refuses before then. */
  advance_terms_accepted_at: string | null;
  cancellation_reason: string | null;
  /** When the event was marked as under way. Null until either party starts it. */
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  client_id: string | null;
  /** Null on a booking a client placed straight against a service. */
  quotation_id: string | null;
  event_id: string | null;
  quotations: BookingQuotationModel | BookingQuotationModel[] | null;
  events: BookingEventModel | BookingEventModel[] | null;
};

/**
 * The escrow behind a booking, as much of it as the vendor's booking page
 * needs. Read-only context: the vendor has no write on escrow at all, so this
 * carries the status that gates starting the booking and the two tranche
 * figures worth showing beside it — not the full row.
 */
export type VendorBookingEscrowModel = {
  id: string;
  status: string;
  currency: string | null;
  gross_amount: number | null;
  advance_amount: number | null;
  balance_amount: number | null;
  /** Set while a dispute or reversal is under review; nothing releases then. */
  timers_frozen_at: string | null;
  /** Null while the advance is still in the held pool. */
  advance_released_at: string | null;
  /** When the cron will release the advance — the vendor's "money arrives" date. */
  advance_release_due_at: string | null;
};

/**
 * The vendor's post-event request for the money still held for them, and where
 * the three-party agreement on it has got to.
 *
 * Read rather than derived: the amount was snapshotted when the request was
 * raised and the consents are what make the figure payable, so the page shows
 * the row rather than recomputing anything from the escrow.
 */
export type SettlementRequestModel = {
  id: string;
  booking_id: string;
  escrow_id: string;
  status: string;
  currency: string | null;
  requested_amount: number | null;
  approved_amount: number | null;
  decision: string | null;
  decision_reason: string | null;
  decided_automatically: boolean | null;
  vendor_note: string | null;
  admin_note: string | null;
  vendor_response: string | null;
  vendor_response_note: string | null;
  client_due_at: string | null;
  vendor_due_at: string | null;
  admin_due_at: string | null;
  client_consent_at: string | null;
  vendor_consent_at: string | null;
  released_at: string | null;
  last_nudge_at: string | null;
  nudge_count: number | null;
  requested_at: string;
};

/** One entry of a settlement's append-only trail, oldest first. */
export type SettlementEventModel = {
  id: string;
  kind: string;
  actor_role: string;
  amount: number | null;
  note: string | null;
  created_at: string;
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

export type VendorQuotationModel = {
  id: string;
  reference_no: string | null;
  status: string;
  total: number | null;
  currency: string | null;
  valid_until: string | null;
  request_details: string | null;
  created_at: string;
  client_id: string | null;
};

export type QuotationItemModel = {
  id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
  sort_order: number | null;
};

// useQuotation selects '*' plus the line items and the linked event. The client
// is NOT embedded here — see DirectoryProfile for why — only `client_id` is,
// which the page resolves through the directory.
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
  /** Advance schedule proposed with the quote; null until it is sent. */
  advance_rate: number | null;
  advance_release_days_before: number | null;
  advance_terms_note: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  vendor_id: string | null;
  client_id: string | null;
  event_id: string | null;
  /**
   * The package this quote was asked for or built from. Set by the client when
   * they request a quote against a published package, and again by
   * `send_quotation` when the vendor answers from one.
   */
  template_id: string | null;
  template_tier_id: string | null;
  /** The rates behind `discount_total` / `tax_total`, stored with the quote. */
  discount_rate: number | null;
  tax_rate: number | null;
  tax_inclusive: boolean | null;
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
 * acting party gave when they withdrew, declined or asked for a revision.
 */
export type QuotationStatusEventModel = {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  occurred_at: string;
  /**
   * Who made the transition — `auth.uid()` at the moment the trigger fired.
   *
   * The only column that says whose words `reason` is, and the reason the
   * feedback callout can name an author instead of guessing one. Guessing is
   * not available: `voided` is written by `void_quotation`, which either side
   * may call, so the status alone would have us telling a client they had
   * cancelled a quote their vendor withdrew.
   */
  actor_id: string | null;
};

/**
 * A vendor's quote package, read whole: header, tiers, tier lines and the
 * add-ons shared across every tier.
 *
 * The field names are the column names because this is what PostgREST hands
 * back, and because `@sinnapi/ui`'s `QuotePackageLike` — the shape all four
 * apps compute and render from — is defined against those names. Renaming here
 * would mean mapping on the way into every component that reads one.
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
  /** How this package is sold — one of the models its service offers. */
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
  admin_unpublished_at: string | null;
  admin_unpublished_reason: string | null;
  quote_template_tiers: PackageTierModel[] | null;
  /** Only the shared add-ons: the read scopes this with `tier_id=is.null`. */
  quote_template_items: PackageLineModel[] | null;
};

/**
 * One line of a vendor's catalogue: WHAT they do, not what it costs.
 *
 * Price lives on the packages that hang off a service, and the "from" figure a
 * service card shows is derived from the cheapest published tier among them —
 * see `useServicePricing`. `base_price`/`currency` are the pre-0823c columns,
 * still selected so the type matches the row and still read by the data-export
 * document for historical services, but no longer written by this portal.
 */
export type ServiceModel = {
  id: string;
  title: string;
  description: string | null;
  /** @deprecated Superseded by package pricing. Never written by this portal. */
  base_price: number | null;
  /** @deprecated Meaningless without `base_price`. */
  currency: string | null;
  is_active: boolean | null;
  category_id: string | null;
  /** `vendor_services.pricing_models` — the ways this vendor will be paid. */
  pricing_models: string[] | null;
  /**
   * Set when the vendor archived the service.
   *
   * A service is never physically deleted: `trg_soft_delete` turns a DELETE on
   * any table with this column into an UPDATE that stamps it, so the row —
   * and every booking and package still pointing at it — survives. Only the
   * services screen reads archived rows, and only so it can offer them back.
   */
  deleted_at: string | null;
};

/** A row of `service_categories`, as the service form's picker reads it. */
export type ServiceCategoryModel = {
  id: string;
  name: string;
};

export type MediaModel = {
  id: string;
  media_type: string;
  url: string | null;
  caption: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
};

export type AvailabilityModel = {
  id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean | null;
};

/**
 * One day the vendor is not available, and why.
 *
 * `source` is the whole grammar of this table: `manual` is the vendor's own
 * decision and can be lifted here, anything else was inserted by a confirmed
 * booking and clears only when that booking does. The embedded booking is what
 * lets the calendar name the job rather than saying "unavailable" — it is null
 * for a manual block, and legitimately so.
 */
export type BlockedDateModel = {
  id: string;
  blocked_date: string;
  reason: string | null;
  source: string | null;
  booking_id: string | null;
  bookings: {
    id: string;
    reference_no: string | null;
    status: string | null;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    amount: number | null;
    currency: string | null;
    client_id: string | null;
  } | null;
};

/**
 * One managed occasion from `event_types`. `key` is the token
 * `search_events_public` matches and the URL carries; `name` is the label.
 */
export type EventTypeRef = { key: string; name: string };

/**
 * A row from `search_events_public` — everything an event card renders. The
 * poster's identity is deliberately absent from the RPC's projection, so a
 * vendor browsing open work sees the brief, not the client behind it.
 */
export type PublicEventModel = {
  id: string;
  title: string;
  description: string | null;
  /** The occasion's key — the token the facets and the URL are built from. */
  event_type: string | null;
  /** The occasion's display name, as an admin manages it in `event_types`. */
  event_type_name: string | null;
  event_date: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  cover_image_url: string | null;
  source: 'admin' | 'client' | string;
};

/** Orderings `search_events_public` whitelists. Anything else falls back server-side. */
export type EventSortKey = 'soonest' | 'newest' | 'budget_asc' | 'budget_desc';

/**
 * Everything that narrows the public-events feed, in the form the RPC takes.
 *
 * `when` is the odd one out: it stays a token ('this_month') rather than being
 * resolved to dates here, because the bands are relative to `current_date` and
 * the only clock that matters is the database's. Resolving them in the browser
 * would bake a stale "today" into every cache key and drift for anyone whose
 * device clock or timezone disagrees.
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

/** One page of the events feed, plus the size of the whole filtered set. */
export type EventSearchPage = {
  events: PublicEventModel[];
  total: number;
  offset: number;
};

/**
 * Result counts per facet option under the current filters. Absent keys mean
 * zero — read through `?? 0` rather than expecting an entry per option.
 * Budget is not counted: it's a continuous range, not a discrete key.
 */
export type EventFacetCounts = {
  type: Record<string, number>;
  source: Record<string, number>;
  location: Record<string, number>;
  when: Record<string, number>;
};

export type EventInterestModel = {
  event_id: string;
  status: string;
};

/**
 * Escrow as the vendor sees it.
 *
 * `agreed_amount` is what they actually receive — commission and the
 * processing fee are charged on top of it to the client, so `gross_amount`
 * (what the client paid) is deliberately larger and is shown only as context.
 * The two tranches always sum back to the agreed amount.
 */
export type EscrowModel = {
  id: string;
  status: string;
  gross_amount: number | null;
  commission_amount: number | null;
  net_payout_amount: number | null;
  agreed_amount: number | null;
  advance_amount: number | null;
  balance_amount: number | null;
  advance_release_due_at: string | null;
  advance_released_at: string | null;
  auto_release_due_at: string | null;
  currency: string | null;
  bookings: BookingRel | BookingRel[] | null;
};

/**
 * A payout tranche. Settlement is manual — Sinnapi's finance team transfers by
 * bank, mobile money, merchant or cash and records the method and reference
 * here, so `settlement_reference` is what a vendor reconciles against their
 * own statement.
 */
export type PayoutModel = {
  id: string;
  kind: string;
  amount: number | null;
  currency: string | null;
  status: string;
  provider: string | null;
  settlement_method: string | null;
  settlement_reference: string | null;
  settled_at: string | null;
  blocked_reason: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type PromotionModel = {
  id: string;
  title: string;
  description: string | null;
  /** The campaign artwork, in `public-media`. Null until the vendor adds one. */
  banner_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
};

/**
 * A discount code as it is read *through* the promotion that owns it.
 *
 * Narrower than {@link DiscountModel} on purpose: the promotions screen shows a
 * code and how often it has been redeemed, and carrying the whole discount row
 * would invite that screen to start editing one.
 */
export type PromotionDiscountModel = {
  id: string;
  promotion_id: string;
  code: string | null;
  type: string;
  value: number;
  currency: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean | null;
};

/**
 * A discount code as the vendor who owns it manages it.
 *
 * Wider than {@link PromotionDiscountModel}: this is the row the Discounts
 * screen edits, so it carries the two terms that screen sets and the campaign
 * the code prices — `promotion_id` is what rolls a redemption up into a
 * campaign's return, and is the same relationship the Promotions screen reads
 * back through.
 */
export type DiscountModel = {
  id: string;
  code: string | null;
  type: string;
  value: number;
  currency: string | null;
  max_uses: number | null;
  used_count: number;
  /** Only redeemable on bookings at or above this figure. Null = no floor. */
  min_amount: number | null;
  /** The campaign this code prices, or null for a standalone code. */
  promotion_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
};

export type ReviewResponseRel = {
  id: string;
  body: string | null;
};

export type ReviewModel = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string;
  client_id: string | null;
  review_responses: ReviewResponseRel | ReviewResponseRel[] | null;
};

export type PlanFeatureModel = {
  feature_key: string;
  value: string | boolean | null;
};

export type PlanModel = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  billing_cycle: string | null;
  sort_order: number | null;
  plan_features: PlanFeatureModel[] | null;
};

/**
 * One row of `get_my_conversations()` (migration 0815f).
 *
 * The counterparty is resolved server-side: `profiles_self_read` stops a vendor
 * from reading a client's `full_name`, so there is no join that can name the
 * other side of a thread. The previous select embedded nothing at all, which is
 * why every conversation in this inbox has rendered as the literal string
 * "Client Vendor" since it shipped.
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

/** A client this vendor may open a conversation with — `get_vendor_clients()`. */
export type VendorClientModel = {
  client_id: string;
  display_name: string;
  avatar_url: string | null;
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

export type VendorProfileEditModel = {
  id: string;
  business_name: string;
  biography: string | null;
  base_city: string | null;
  website: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
  /** The listing image clients see. Managed by the logo card on the profile page. */
  primary_image_url: string | null;
  /** Read-only listing facts, shown beside the form rather than as dead fields. */
  slug: string;
  status: string;
  visibility: string;
  created_at: string | null;
};

/** A row from the `service_regions` reference table, as the coverage picker lists it. */
export type ServiceRegionModel = {
  key: string;
  name: string;
  scope: string;
};
