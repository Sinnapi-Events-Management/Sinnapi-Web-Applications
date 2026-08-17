// Admin-portal read models. The Supabase client is untyped, so these describe
// the shapes returned by the queries in src/hooks/queries.ts. Each query asserts
// one of these at the data boundary so components stay fully typed.
//
// PostgREST returns embedded relations as an object OR an array depending on the
// inferred cardinality; such fields are typed as `T | T[] | null` and normalized
// at the call site with `one<T>()` from src/lib/rel.ts.

import type { BookingPaymentWindowFields } from '@sinnapi/ui';

// --- shared relation shapes -------------------------------------------------

export type ProfileRef = {
  full_name: string | null;
  email: string | null;
};

export type ProfileContactRef = ProfileRef & {
  phone: string | null;
};

export type VendorRef = {
  business_name: string | null;
};

export type BookingRef = {
  reference_no: string | null;
};

export type PricingPlanRef = {
  name: string | null;
};

// --- profile / auth ---------------------------------------------------------

// The signed-in admin's own profile row. The shell only needs the display name
// and avatar, but the same query backs the self-service Profile page, so it also
// carries the editable name parts / phone and the read-only account facts
// (status, member-since, last sign-in) that page reports.
export type ProfileModel = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string | null;
  created_at: string | null;
  last_login_at: string | null;
};

// --- dashboard --------------------------------------------------------------

export type AdminDashboardModel = {
  pendingApplications: number;
  pendingPayouts: number;
  openDisputes: number;
  escrowHeld: number;
  activeVendors: number;
};

// --- vendor application intake ----------------------------------------------
// The admin "Applications" queue reads the anonymous, account-less public
// intake (`vendor_application_intake`). Unlike the auth-bound
// `vendor_applications`, there is no `applicant_id`/profiles join — the owner
// is carried as flat `owner_*` fields — and there is no `submitted_at`/
// `is_reapplication` (use `created_at`). Statuses: submitted | reviewing |
// approved | rejected.

export type IntakeReferee = {
  fullName?: string;
  phone?: string;
  email?: string;
  eventWorkedOn?: string;
  eventDate?: string;
};

export type IntakeListModel = {
  id: string;
  business_name: string;
  status: string;
  owner_full_name: string | null;
  owner_email: string | null;
  created_at: string | null;
};

export type IntakeDetailModel = {
  id: string;
  submission_ref: string;
  status: string;
  business_name: string;
  applicant_type: string | null;
  biography: string | null;
  business_location: string | null;
  base_city: string | null;
  years_in_operation: string | null;
  website: string | null;
  primary_category_key: string | null;
  service_category_keys: string[] | null;
  pricing_model: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
  lead_time: string | null;
  service_region_keys: string[] | null;
  icandy_alumni: boolean | null;
  owner_full_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  national_id_path: string | null;
  proof_of_work_path: string | null;
  business_reg_number: string | null;
  tax_id: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  branch: string | null;
  referees: IntakeReferee[] | null;
  review_notes: string | null;
  reviewed_at: string | null;
  promoted_application_id: string | null;
  created_at: string | null;
};

// --- vendors ----------------------------------------------------------------

export type VendorAdminModel = {
  id: string;
  business_name: string | null;
  slug: string;
  status: string;
  visibility: string;
  avg_rating: number | null;
  review_count: number | null;
  profile_image_url: string | null;
  base_city: string | null;
  created_at: string | null;
};

// --- vendor accounts (People → Vendors) --------------------------------------
// One row per vendor OWNER ACCOUNT, from `search_vendor_accounts` (0810b). This
// is the person, not the shopfront: `VendorAdminModel` above is the listing.
//
// Every vendor-side field is nullable because the account can outlive — or
// precede — the listing. A promotion that provisioned the account and then
// failed before `approve_vendor` produces exactly that row, and it is the one
// an operator most needs to see.

export type VendorAccountModel = {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  account_status: string;
  /** Operator justification for the current non-active state. Internal only. */
  status_reason: string | null;
  status_changed_at: string | null;
  /** Non-null only while suspended — the instant the hold lifts by itself. */
  suspended_until: string | null;
  /**
   * Null means the vendor has never signed in. That is the whole basis of the
   * "resend credentials" affordance: the one-time password from promotion is
   * never stored, so an account stuck here has no way in that support can
   * recover any other way.
   */
  last_login_at: string | null;
  created_at: string | null;
  vendor_id: string | null;
  business_name: string | null;
  vendor_status: string | null;
  vendor_visibility: string | null;
  /** When the public application was submitted; null if they never came through intake. */
  applied_at: string | null;
};

export type OwnerRef = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type NamedRef = {
  name: string | null;
};

// Full single-vendor record backing the admin vendor detail page.
export type VendorDetailModel = {
  id: string;
  business_name: string | null;
  slug: string;
  biography: string | null;
  base_city: string | null;
  website: string | null;
  years_in_operation: string | null;
  pricing_model: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
  profile_image_url: string | null;
  primary_image_url: string | null;
  status: string;
  visibility: string;
  is_featured: boolean;
  avg_rating: number | null;
  review_count: number | null;
  trial_ends_at: string | null;
  created_at: string | null;
  owner: OwnerRef | OwnerRef[] | null;
  category: NamedRef | NamedRef[] | null;
};

// Headline counts shown as KPI stat cards on the vendor detail page.
export type VendorKpis = {
  bookings: number;
  quotations: number;
  payments: number;
  payouts: number;
};

/** Headline counts for a client's detail view. */
export type ClientKpis = {
  bookings: number;
  events: number;
  quotations: number;
  vendors: number;
};

/** A distinct vendor a client has engaged (derived from bookings/quotations). */
export type EngagedVendor = {
  id: string;
  business_name: string | null;
  profile_image_url: string | null;
  status: string;
};

// Vendor reviews (public feedback) surfaced on the detail page.
export type ReviewModel = {
  id: string;
  rating: number | null;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string | null;
};

// --- users / RBAC -----------------------------------------------------------

export type RoleKeyRef = {
  id: string;
  key: string;
  name: string;
  is_admin?: boolean | null;
};

export type UserRoleRow = {
  roles: RoleKeyRef | RoleKeyRef[] | null;
};

export type UserModel = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string | null;
  user_roles: UserRoleRow[] | null;
};

export type RolePermissionRef = {
  permission_id: string;
};

export type RoleModel = {
  id: string;
  key: string;
  name: string;
  is_admin: boolean | null;
  role_permissions: RolePermissionRef[] | null;
};

export type PermissionModel = {
  id: string;
  key: string;
  category: string | null;
  description: string | null;
};

// Shape consumed by AdminProvider's permission resolution query.
export type PermissionKeyRef = {
  key: string;
};

export type RolePermissionsNested = {
  permissions: PermissionKeyRef | PermissionKeyRef[] | null;
};

export type AdminRoleNested = {
  key: string;
  is_admin: boolean | null;
  role_permissions: RolePermissionsNested[] | null;
};

export type AdminUserRoleRow = {
  roles: AdminRoleNested | AdminRoleNested[] | null;
};

// --- escrow / payouts / refunds / payments / ledger -------------------------

/**
 * Escrow as Finance sees it.
 *
 * Commission and the processing fee are charged on top of the agreed amount,
 * so `gross_amount` (what the client paid) is always the largest figure and
 * `agreed_amount` is what the vendor is owed across both tranches.
 */
export type EscrowModel = {
  id: string;
  status: string;
  gross_amount: number | null;
  commission_amount: number | null;
  net_payout_amount: number | null;
  agreed_amount: number | null;
  psp_fee_amount: number | null;
  advance_amount: number | null;
  balance_amount: number | null;
  advance_release_due_at: string | null;
  advance_released_at: string | null;
  auto_release_due_at: string | null;
  timers_frozen_at: string | null;
  currency: string | null;
  client_confirmed_at: string | null;
  vendors: VendorRef | VendorRef[] | null;
  bookings: BookingRef | BookingRef[] | null;
};

/**
 * A payout tranche awaiting manual settlement.
 *
 * Sinnapi runs no payout API: Finance transfers by bank, mobile money,
 * merchant or cash and evidences it here. `recorded_by` and `approved_by` are
 * the two halves of the maker-checker control and must never be the same
 * person — enforced by a table constraint and re-checked in the RPC.
 */
export type PayoutModel = {
  id: string;
  kind: string;
  escrow_id: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
  settlement_method: string | null;
  settlement_reference: string | null;
  destination_label: string | null;
  proof_path: string | null;
  blocked_reason: string | null;
  notes: string | null;
  requested_by: string | null;
  recorded_by: string | null;
  recorded_at: string | null;
  approved_by: string | null;
  settled_at: string | null;
  created_at: string | null;
  vendors: VendorRef | VendorRef[] | null;
};

/** An item in the reconciliation exception queue. Nothing here auto-corrects. */
export type ReconciliationExceptionModel = {
  id: string;
  kind: string;
  status: string;
  severity: string;
  detail: string | null;
  expected: number | null;
  actual: number | null;
  occurrences: number;
  escrow_id: string | null;
  payment_id: string | null;
  payout_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

export type RefundModel = {
  id: string;
  amount: number | null;
  currency: string | null;
  type: string;
  status: string;
  reason: string | null;
  requested_by: string | null;
  created_at: string | null;
};

export type PaymentModel = {
  id: string;
  purpose: string;
  amount: number | null;
  currency: string | null;
  status: string;
  provider: string;
  provider_method: string;
  created_at: string | null;
};

// Payment joined to its booking's reference (payments link to a vendor only
// through their booking, so the detail page filters via `bookings.vendor_id`).
export type VendorPaymentModel = PaymentModel & {
  bookings: BookingRef | BookingRef[] | null;
};

export type LedgerEntryModel = {
  id: string;
  entry_group_id: string | null;
  account: string;
  direction: string;
  amount: number | null;
  currency: string | null;
  description: string | null;
  occurred_at: string | null;
};

// --- disputes ---------------------------------------------------------------

export type DisputeModel = {
  id: string;
  reason: string;
  status: string;
  sla_due_at: string | null;
  created_at: string | null;
  escrow_id: string | null;
  bookings: BookingRef | BookingRef[] | null;
};

// --- subscriptions / plans --------------------------------------------------

/**
 * A subscription as returned by the `search_subscriptions_admin` RPC — flat, with
 * the owning vendor's name and the plan's name already joined in (both nullable:
 * `plan_name` is null for a plan-less subscription).
 */
export type SubscriptionAdminModel = {
  id: string;
  status: string;
  current_period_end: string | null;
  grace_until: string | null;
  trial_ends_at: string | null;
  business_name: string | null;
  plan_name: string | null;
};

export type PlanModel = {
  id: string;
  key: string;
  name: string;
  /** One-line positioning shown under the name on the public card. */
  tagline: string | null;
  description: string | null;
  /** Marks the recommended/"most popular" plan for emphasis. */
  highlight: boolean;
  price: number | null;
  currency: string | null;
  billing_cycle: string;
  is_active: boolean;
  trial_days: number | null;
  sort_order: number;
  /** Display bullet list rendered on the marketing card. */
  features: string[];
};

export type ServiceCategoryModel = {
  id: string;
  key: string;
  name: string;
  parent_id: string | null;
  /** Embedded via `parent:service_categories!parent_id(name)`; null for top-level categories. */
  parent: { name: string } | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

/** Full category list for the parent-category select — unpaginated, id + name only. */
export type ServiceCategoryOption = { id: string; name: string };

/**
 * A managed event type (`event_types`) — the occasion vocabulary every portal
 * and the public site filter by. Unlike a service category these don't nest, so
 * there is no `parent_id`.
 */
export type EventTypeModel = {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

/**
 * An event type as a form select entry. `is_active` rides along so the picker
 * can mark a retired type rather than silently offering it — an event already
 * pointing at one must keep showing it (see `useEventTypeSelectOptions`).
 */
export type EventTypeOption = { id: string; name: string; is_active: boolean };

export type ServiceRegionModel = {
  id: string;
  key: string;
  name: string;
  scope: string;
  is_active: boolean;
  sort_order: number;
};

/** A single plan plus audit timestamps, for the plan detail page. */
export type PlanDetailModel = PlanModel & {
  created_at: string;
  updated_at: string;
};

/** Headline subscriber counts for a plan's KPI row. */
export type PlanKpis = {
  subscribers: number;
  active: number;
  trialing: number;
  /** Subscriptions that have lapsed on this plan (status = 'expired'). */
  expired: number;
};

// --- bookings / quotations / events -----------------------------------------

export type BookingModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  amount: number | null;
  currency: string | null;
  /**
   * The agreed rail and how far the terms conversation got. Optional because
   * the vendor-detail tab selects a narrower row than the platform-wide list —
   * the chip renders "Not set" for either absence, which is the truth in both.
   */
  payment_type?: string | null;
  payment_terms_status?: string | null;
  vendors: VendorRef | VendorRef[] | null;
} & Partial<BookingPaymentWindowFields>;

/**
 * One escrow booking that is confirmed but not funded, as
 * `search_unpaid_bookings_admin` returns it.
 *
 * Its own model rather than a wider `BookingModel`, because the queue exists to
 * answer questions the bookings list cannot: how long the client has had, how
 * often they have been chased, and — the one that decides what an operator
 * does next — whether they ever opened a checkout at all. A client who tried
 * and failed needs help; one who never started needs chasing, and those are
 * different messages.
 */
export type UnpaidBookingModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  amount: number | null;
  currency: string | null;
  client_id: string | null;
  client_name: string;
  vendor_id: string | null;
  vendor_name: string;
  payment_window_opened_at: string | null;
  payment_due_at: string | null;
  payment_due_override_at: string | null;
  payment_due_override_reason: string | null;
  /** The deadline in force — the override when there is one. Resolved server-side. */
  effective_due_at: string | null;
  payment_overdue_at: string | null;
  last_payment_nudge_at: string | null;
  payment_nudge_count: number | null;
  /** `null` when the client has never opened a checkout; else 'initiated' | 'failed'. */
  escrow_status: string | null;
  escrow_attempt_no: number | null;
};

/** The unpaid queue's headline figures, from `count_unpaid_bookings_admin`. */
export type UnpaidBookingCounts = {
  awaiting: number;
  /** Still payable, but inside six hours — the actionable middle. */
  due_soon: number;
  overdue: number;
  overdue_value: number;
  currency: string;
  oldest_overdue_at: string | null;
};

/** One entry in a booking's payment-window trail. */
export type BookingPaymentEventModel = {
  id: string;
  booking_id: string;
  kind: string;
  actor_id: string | null;
  actor_role: string;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type QuotationModel = {
  id: string;
  reference_no: string | null;
  status: string;
  total: number | null;
  currency: string | null;
  created_at: string | null;
  vendors: VendorRef | VendorRef[] | null;
};

/** A party to a booking, as much of them as the console shows inline. */
export type BookingPartyModel = {
  id: string;
  name: string | null;
  /** Present on the vendor only — the public listing slug. */
  slug?: string | null;
  email: string | null;
  phone: string | null;
};

/** The escrow behind a booking, flattened by `get_booking_admin`. */
export type BookingEscrowModel = {
  id: string;
  status: string;
  currency: string | null;
  gross_amount: number | null;
  agreed_amount: number | null;
  commission_amount: number | null;
  psp_fee_amount: number | null;
  advance_rate: number | null;
  advance_amount: number | null;
  balance_amount: number | null;
  advance_release_due_at: string | null;
  advance_released_at: string | null;
  balance_released_at: string | null;
  timers_frozen_at: string | null;
};

/**
 * One booking, fully resolved for the console — the shape `get_booking_admin`
 * returns. The three optional halves are genuinely optional: a booking can be
 * placed without a quotation behind it, without an event to hang off, and
 * without anyone having funded it yet.
 */
export type BookingAdminModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  /** Postgres `time` values ("14:00:00"); either end may be absent. */
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  currency: string | null;
  amount: number | null;
  /** The payment rail agreed for this booking — `escrow` or `direct`. */
  payment_type: string | null;
  /**
   * The terms conversation, which the console needs whole: an off-platform
   * complaint turns on whether the vendor ever actually agreed to that rail,
   * and on what either side said when they did.
   */
  payment_terms_status: string | null;
  payment_terms_counter: string | null;
  payment_terms_note: string | null;
  payment_terms_from_event: boolean | null;
  payment_terms_responded_at: string | null;
  advance_rate: number | null;
  advance_release_days_before: number | null;
  advance_terms_note: string | null;
  advance_terms_accepted_at: string | null;
  /** Resolved to a name by the RPC, not a bare id. */
  advance_terms_accepted_by: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  /**
   * The clock the client had to fund this booking. `null` when there is none —
   * an off-platform booking, or one no vendor has confirmed — which is one
   * check rather than eight independently-null columns.
   */
  payment_window: BookingPaymentWindowModel | null;
  vendor: BookingPartyModel;
  client: BookingPartyModel;
  /** `payment_type` here outranks the booking's own — see `payment_terms_from_event`. */
  event: { id: string; title: string | null; payment_type: string | null } | null;
  escrow: BookingEscrowModel | null;
  /** Same shape as `get_event_quotation`, so `downloadQuotationPdf` renders it. */
  quotation: QuotationDocument | null;
};

/**
 * A booking's payment clock, as `get_booking_admin` returns it.
 *
 * `effective_due_at` is the deadline in force, resolved server-side — the
 * override when an admin granted one, the original otherwise. The two raw
 * columns are kept beside it so the console can still show what the deadline
 * was before somebody moved it, which is the question a vendor asks when their
 * date was held four days longer than they expected.
 */
export type BookingPaymentWindowModel = {
  opened_at: string | null;
  due_at: string | null;
  override_at: string | null;
  override_reason: string | null;
  /** Resolved to a name by the RPC, not a bare id. */
  override_by: string | null;
  effective_due_at: string | null;
  overdue_at: string | null;
  settled_at: string | null;
  last_nudge_at: string | null;
  nudge_count: number | null;
};

/**
 * One entry on a booking's merged activity trail. `kind` groups the four
 * sources the server unions together; `detail` is already the sentence to
 * render. `actor` is null for the entries no human caused — a webhook
 * confirming funding, the cron releasing an advance.
 */
export type BookingActivityModel = {
  kind: 'status' | 'note' | 'escrow' | 'payment' | 'admin';
  label: string;
  detail: string | null;
  actor: string | null;
  amount: number | null;
  currency: string | null;
  occurred_at: string;
};

/**
 * A vendor's post-event request for the money still held, and the three-party
 * agreement on what is actually paid.
 *
 * The console's stake in this is narrow and specific: put the request to the
 * client, then release exactly the figure both parties consented to. Which is
 * why `approved_amount` and the two consent stamps matter more here than any
 * of the workflow columns — releasing a different number is the failure this
 * record exists to prevent.
 */
export type SettlementRequestModel = {
  id: string;
  booking_id: string;
  escrow_id: string;
  vendor_id: string;
  client_id: string;
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
  payout_id: string | null;
  refund_id: string | null;
  dispute_id: string | null;
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

export type EventModel = {
  id: string;
  title: string;
  source: string;
  status: string;
  event_date: string | null;
  is_public: boolean | null;
  created_at: string | null;
};

/** The full editable event behind the edit drawer (see `useEvent`). */
export type EventDetailModel = {
  id: string;
  posted_by: string | null;
  source: string;
  title: string;
  description: string | null;
  event_type_id: string | null;
  /**
   * The managed type behind `event_type_id`, embedded via
   * `event_type:event_types(key,name)`. `key` is the token every filter and
   * facet count is built from; `name` is what gets rendered.
   */
  event_type: { key: string; name: string } | null;
  event_date: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  status: string;
  is_public: boolean | null;
  cover_image_url: string | null;
  created_at: string | null;
  /** The profile that posted the event (Supabase to-one embed). */
  poster: OwnerRef | OwnerRef[] | null;
};

// --- event ↔ vendor engagement (event detail page) --------------------------
// Both list shapes are returned flat by the `search_event_*` RPCs (vendor
// fields already joined in), so no relation normalization is needed. The
// `vendor_id` on each row is what the approve/reject/message actions key on.

/** A vendor that expressed interest in an event (`search_event_interests`). */
export type EventInterestModel = {
  id: string;
  vendor_id: string;
  business_name: string | null;
  profile_image_url: string | null;
  base_city: string | null;
  message: string | null;
  status: string;
  created_at: string | null;
};

/** A quotation submitted against an event (`search_event_quotations`). */
export type EventQuotationModel = {
  id: string;
  vendor_id: string;
  business_name: string | null;
  reference_no: string | null;
  status: string;
  currency: string | null;
  total: number | null;
  sent_at: string | null;
  created_at: string | null;
};

/** Headline engagement counts for the event detail KPI row. */
export type EventEngagementKpis = {
  interested: number;
  shortlisted: number;
  declined: number;
  quotations: number;
};

/** One priced line on a quotation. */
export type QuotationItem = {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
};

/**
 * The full quotation document behind the "Download quotation" action, built by
 * the `get_event_quotation` RPC (the only admin-visible path to line items).
 */
export type QuotationDocument = {
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
  sent_at: string | null;
  created_at: string | null;
  vendor_name: string | null;
  client_name: string | null;
  event_title: string | null;
  items: QuotationItem[];
};

// --- moderation -------------------------------------------------------------

export type ReviewRef = {
  id: string;
  rating: number | null;
  body: string | null;
  vendor_id: string | null;
};

export type ReviewReportModel = {
  id: string;
  reason: string;
  status: string;
  created_at: string | null;
  reviews: ReviewRef | ReviewRef[] | null;
};

export type MessageRef = {
  id: string;
  body: string | null;
  conversation_id: string | null;
};

export type MessageFlagModel = {
  id: string;
  reason: string;
  status: string;
  created_at: string | null;
  messages: MessageRef | MessageRef[] | null;
};

// --- notifications / templates / settings -----------------------------------

export type NotificationTemplateModel = {
  id: string;
  trigger_key: string;
  channel: string;
  subject: string | null;
  locale: string;
  is_active: boolean;
};

export type SettingModel = {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
};

export type NotificationModel = {
  id: string;
  trigger_key: string;
  title: string | null;
  body: string | null;
  /**
   * Producer-supplied context. Deliberately untyped: the three writers each use
   * a different shape — `{dispute_id}` (cron), `{aggregate,id}` (outbox
   * dispatch) and `{mismatches}` (reconciliation) — so consumers must probe
   * rather than destructure.
   */
  data: Record<string, unknown> | null;
  /** `notification_channel` enum — 'in_app' | 'email'. */
  channel: string;
  read_at: string | null;
  created_at: string | null;
};

// --- compliance: audit / retention / erasure --------------------------------

/** The profile that performed an audited action, with its roles embedded. */
export type AuditActor = {
  id: string;
  full_name: string | null;
  email: string | null;
  user_roles: UserRoleRow[] | null;
};

export type AuditLogModel = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  occurred_at: string | null;
  /** Row snapshot before the change (null for inserts). */
  before: Record<string, unknown> | null;
  /** Row snapshot after the change (null for deletes). */
  after: Record<string, unknown> | null;
  /** Embedded actor profile; null when the action was automated (system). */
  actor: AuditActor | AuditActor[] | null;
};

export type RetentionPolicyModel = {
  id: string;
  data_category: string;
  retention_period: string | null;
  action_on_expiry: string;
  legal_hold: boolean | null;
  description: string | null;
};

export type ErasureRequestModel = {
  id: string;
  status: string;
  notes: string | null;
  created_at: string | null;
  profiles: ProfileRef | ProfileRef[] | null;
};

// --- inbox ------------------------------------------------------------------

/**
 * One row of `get_my_conversations()` (migration 0815f).
 *
 * The counterparty is resolved server-side. `profiles_self_read` does grant
 * admins profile access, so this portal *could* have joined for a name — but
 * the old select instead embedded `vendors(business_name)` and fell back to
 * `titleize(type)`, which is why a client support thread has always rendered
 * as the literal string "Client Admin" in this inbox.
 *
 * The RPC also folds in the newest-message preview and the unread count, both
 * of which used to cost a separate query: the preview came from a limit-1
 * lateral embed on `messages` per row, and the unread state from a second
 * fetch of `conversation_participants`.
 *
 * `is_observer` is true for threads visible only through `moderation.manage` —
 * the admin is not a participant, so they can read but not yet reply.
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
  created_at: string | null;
  edited_at: string | null;
  is_system: boolean;
  moderation_status: string;
  message_attachments: MessageAttachmentModel[] | null;
};

/**
 * One row of the Blocked Accounts list, from `list_blocked_accounts`.
 *
 * Two states share this shape, discriminated by `kind`. A `locked_out` row has
 * every attempt/device/location field populated and expires on its own at
 * `locked_until`; a `suspended` row has none of them and expires never. The
 * nullability below is that difference, not missing data.
 */
export type BlockedAccountModel = {
  kind: 'locked_out' | 'suspended';
  /** Null when the locked address matches no account — i.e. an attack, not a user. */
  profile_id: string | null;
  email: string;
  full_name: string | null;
  account_status: string | null;
  role_keys: string[] | null;
  /** Which portal the lockout applies to. Null for suspensions, which are global. */
  portal: string | null;
  attempt_count: number | null;
  first_attempt_at: string | null;
  last_attempt_at: string | null;
  /** When the lockout lifts by itself. Null for suspensions. */
  locked_until: string | null;
  /** Sortable "blocked since" for either kind. */
  state_since: string | null;
  last_ip: string | null;
  last_user_agent: string | null;
  /** ISO-3166 alpha-2. Null for rows captured before country was recorded. */
  last_country: string | null;
};

// =====================================================================
// MARKETING — newsletter campaigns, consent, suppression
// =====================================================================

export type NewsletterAudience = 'clients' | 'vendors';
export type MarketingTopic = 'client_updates' | 'vendor_updates';

/** One row of the campaign list. `blocks` is omitted — the list never renders it. */
export type NewsletterCampaignModel = {
  id: string;
  title: string;
  subject: string;
  preheader: string | null;
  audience: NewsletterAudience;
  topic: MarketingTopic;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

/** The campaign as the composer edits it — the list row plus its body. */
export type NewsletterCampaignDetail = NewsletterCampaignModel & {
  blocks: unknown;
  attested_by: string | null;
  attested_at: string | null;
};

/**
 * One candidate recipient, from `admin_newsletter_audience`.
 *
 * `eligible` is decided server-side; `reason` says why not when it is false, so
 * the picker can grey a row and explain it rather than silently omitting the
 * person and leaving an operator to wonder where their audience went.
 */
export type NewsletterAudienceRow = {
  profile_id: string;
  full_name: string;
  email: string;
  status: string;
  eligible: boolean;
  reason: 'suppressed' | 'pending' | 'unsubscribed' | 'none' | null;
  total_count: number;
};

export type NewsletterAudienceCounts = {
  total: number;
  eligible: number;
  suppressed: number;
  no_consent: number;
};

/**
 * One ad-hoc recipient: a name AND an address, never one without the other.
 *
 * The pair is the unit everywhere off the audience path — typed into the
 * composer, read out of a spreadsheet, stored in an address book — because a
 * bare address leaves `newsletter_recipients.full_name` null, which is a send
 * record that cannot say who was mailed and, months later, a list nobody can
 * audit. It is also the prerequisite for greeting recipients by name, which the
 * renderer does not do yet and cannot until the name is there to use.
 */
export type NewsletterContact = {
  full_name: string;
  email: string;
};

/** A saved address book, as `admin_contact_lists` returns it. */
export type ContactListModel = {
  id: string;
  title: string;
  description: string | null;
  contact_count: number;
  created_at: string;
  updated_at: string;
  total_count: number;
};

/** One person in an address book. `suppressed` is decided server-side. */
export type ContactListContactModel = {
  id: string;
  full_name: string;
  email: string;
  suppressed: boolean;
  total_count: number;
};

/** What `admin_contact_list_save` reports back. */
export type ContactListSaveResult = {
  list_id: string;
  title: string;
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
};

/** What `admin_newsletter_queue` reports back, shown in the send confirmation. */
export type NewsletterQueueResult = {
  queued: number;
  skipped_suppressed: number;
  skipped_no_consent: number;
  imported: number;
};

export type NewsletterStats = {
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  failed: number;
  unsubscribed: number;
};

/** One row of the subscriber register. */
export type MarketingSubscriptionModel = {
  id: string;
  email: string;
  topic: MarketingTopic;
  status: string;
  source: string;
  consent_text: string | null;
  consent_at: string | null;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
};

export type EmailSuppressionModel = {
  id: string;
  email: string;
  reason: string;
  detail: string | null;
  created_at: string;
};
