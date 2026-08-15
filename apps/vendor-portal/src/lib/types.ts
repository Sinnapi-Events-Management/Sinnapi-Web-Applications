// Read models for the vendor portal. The Supabase client is untyped, so query
// results are effectively `any`; we assert these concrete shapes ONCE at the
// query boundary (see src/hooks/queries.ts) so components stay fully typed.
//
// Embedded relations are returned by PostgREST as an object OR an array; such
// fields are typed as `T | T[] | null` and normalized with `one<T>()` (rel.ts).

export type ProfileRel = {
  full_name: string | null;
};

export type ProfileContactRel = {
  full_name: string | null;
  email: string | null;
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
  profiles: ProfileRel | ProfileRel[] | null;
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
  payment_type: string | null;
  cancellation_reason: string | null;
  /** When the event was marked as under way. Null until either party starts it. */
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  profiles: ProfileContactRel | ProfileContactRel[] | null;
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
  profiles: ProfileRel | ProfileRel[] | null;
};

export type QuotationItemModel = {
  id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
  sort_order: number | null;
};

// useQuotation selects '*' plus the client, the line items and the linked event.
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
  quotation_items: QuotationItemModel[] | null;
  profiles: ProfileRel | ProfileRel[] | null;
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
};

export type TemplateModel = {
  id: string;
  name: string;
  currency: string | null;
  notes: string | null;
  is_active: boolean | null;
  quote_template_items: { id: string }[] | null;
};

export type ServiceModel = {
  id: string;
  title: string;
  description: string | null;
  base_price: number | null;
  currency: string | null;
  is_active: boolean | null;
  category_id: string | null;
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

export type BlockedDateModel = {
  id: string;
  blocked_date: string;
  reason: string | null;
  source: string | null;
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
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
};

export type DiscountModel = {
  id: string;
  code: string | null;
  type: string;
  value: number;
  currency: string | null;
  max_uses: number | null;
  used_count: number;
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
  review_responses: ReviewResponseRel | ReviewResponseRel[] | null;
  profiles: ProfileRel | ProfileRel[] | null;
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
