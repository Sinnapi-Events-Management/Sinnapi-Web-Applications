// Admin-portal read models. The Supabase client is untyped, so these describe
// the shapes returned by the queries in src/hooks/queries.ts. Each query asserts
// one of these at the data boundary so components stay fully typed.
//
// PostgREST returns embedded relations as an object OR an array depending on the
// inferred cardinality; such fields are typed as `T | T[] | null` and normalized
// at the call site with `one<T>()` from src/lib/rel.ts.

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

export type ProfileModel = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
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

export type EscrowModel = {
  id: string;
  status: string;
  gross_amount: number | null;
  commission_amount: number | null;
  net_payout_amount: number | null;
  currency: string | null;
  client_confirmed_at: string | null;
  vendors: VendorRef | VendorRef[] | null;
  bookings: BookingRef | BookingRef[] | null;
};

export type PayoutModel = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string;
  requested_by: string | null;
  approved_by: string | null;
  created_at: string | null;
  vendors: VendorRef | VendorRef[] | null;
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
  vendors: VendorRef | VendorRef[] | null;
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
  event_type: string | null;
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

/** Newest message of a conversation, embedded for the inbox row preview. */
export type MessagePreviewRef = {
  body: string | null;
  created_at: string | null;
  sender_id: string | null;
};

export type ConversationModel = {
  id: string;
  type: string;
  subject: string | null;
  last_message_at: string | null;
  status: string;
  created_at: string | null;
  vendors: VendorRef | VendorRef[] | null;
  // PostgREST caps this embed at the single newest message (see useConversations),
  // so it is an array of at most one — never the full thread.
  messages: MessagePreviewRef[] | null;
};

/**
 * The signed-in admin's own participant row. `last_read_at` is what the unread
 * badge is derived from; RLS always lets a profile read its own rows.
 */
export type ConversationReadStateModel = {
  conversation_id: string;
  last_read_at: string | null;
  is_muted: boolean;
};

export type MessageModel = {
  id: string;
  sender_id: string | null;
  body: string | null;
  created_at: string | null;
  moderation_status: string;
};
