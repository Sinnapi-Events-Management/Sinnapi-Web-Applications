// Every read behind the export, in one place.
//
// ALL of them go through the CALLER'S client, not the service-role one. That is
// the security property this file is built around: an export is by definition a
// dump of "everything about me", so the one mistake that matters is a filter
// that quietly widens to someone else's rows. Under RLS the database refuses
// that on our behalf — a missing `.eq()` returns less, never more. A
// service-role client would make the same slip return the entire table.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Rows per section. An export is a record, not a report, so the cap is high;
 * where it bites, `Fetched.truncated` says so and the PDF prints it. A silently
 * truncated data export is a compliance answer that is wrong without saying so.
 */
export const SECTION_LIMIT = 500;

/** A section's rows plus whatever went wrong getting them. */
export type Fetched<T> = {
  rows: T[];
  /** Set when the read failed outright — the section prints this instead of "none". */
  error: string | null;
  /** True when the section hit `SECTION_LIMIT` and more rows exist. */
  truncated: boolean;
};

const empty = <T>(): Fetched<T> => ({ rows: [], error: null, truncated: false });

/**
 * Run one section's read, keeping a failure local to that section.
 *
 * A partial export beats no export: if `payouts` is unreadable, the user should
 * still receive their bookings, with the gap stated on the page rather than a
 * 500 and nothing at all.
 */
async function fetchRows<T>(
  build: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<Fetched<T>> {
  try {
    const { data, error } = await build();
    if (error) return { rows: [], error: error.message, truncated: false };
    // Cast rather than constrain the parameter: PostgREST infers a row type
    // from the literal select string, and pinning the builder's return type to
    // `T[]` here would make every embed (`vendors(business_name)`) a type error
    // at the call site for a shape that is correct at runtime.
    const rows = (data ?? []) as T[];
    return { rows, error: null, truncated: rows.length >= SECTION_LIMIT };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'read failed';
    return { rows: [], error: message, truncated: false };
  }
}

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  locale: string | null;
  preferred_currency: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type VendorRow = {
  id: string;
  business_name: string;
  slug: string;
  biography: string | null;
  base_city: string | null;
  website: string | null;
  status: string;
  visibility: string;
  avg_rating: number;
  review_count: number;
  created_at: string;
};

export type BookingRow = {
  reference_no: string;
  status: string;
  event_date: string;
  location: string | null;
  currency: string;
  amount: number;
  created_at: string;
  vendors: { business_name: string } | null;
};

export type QuotationRow = {
  reference_no: string;
  status: string;
  currency: string;
  total: number;
  valid_until: string | null;
  created_at: string;
  vendors: { business_name: string } | null;
};

export type PaymentRow = {
  purpose: string;
  provider: string;
  provider_method: string;
  provider_ref: string | null;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type EventRow = {
  title: string;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
};

export type ReviewRow = {
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string;
  vendors: { business_name: string } | null;
};

export type MessageRow = {
  body: string | null;
  is_system: boolean;
  created_at: string;
  sender_id: string;
  conversations: { subject: string | null; type: string } | null;
};

export type NotificationRow = {
  title: string;
  body: string | null;
  channel: string;
  read_at: string | null;
  created_at: string;
};

export type LoginRow = {
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  is_new_device: boolean;
  occurred_at: string;
};

export type ErasureRow = { status: string; notes: string | null; created_at: string };

export type ServiceRow = {
  title: string;
  description: string | null;
  base_price: number | null;
  currency: string | null;
  is_active: boolean;
};

export type PayoutRow = {
  amount: number;
  currency: string;
  status: string;
  provider_ref: string | null;
  completed_at: string | null;
  created_at: string;
};

export type SubscriptionRow = {
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  cancelled_at: string | null;
  pricing_plans: { name: string } | null;
};

/** Everything the document is built from. */
export type ExportData = {
  profile: ProfileRow | null;
  roles: string[];
  vendor: VendorRow | null;
  events: Fetched<EventRow>;
  bookings: Fetched<BookingRow>;
  quotations: Fetched<QuotationRow>;
  payments: Fetched<PaymentRow>;
  reviews: Fetched<ReviewRow>;
  messages: Fetched<MessageRow>;
  notifications: Fetched<NotificationRow>;
  logins: Fetched<LoginRow>;
  erasures: Fetched<ErasureRow>;
  services: Fetched<ServiceRow>;
  payouts: Fetched<PayoutRow>;
  subscriptions: Fetched<SubscriptionRow>;
};

/**
 * Gather the caller's data.
 *
 * The vendor-only sections are read only when the caller actually owns a vendor
 * — not because RLS would leak them otherwise, but because a client's export
 * should not carry three empty tables about payouts they were never eligible
 * for. The rest is portal-agnostic: one function serves both portals, since
 * "everything held about me" does not vary by which app asked.
 */
export async function loadExportData(db: SupabaseClient, userId: string): Promise<ExportData> {
  const [profileResult, roleResult, vendorResult] = await Promise.all([
    db
      .from('profiles')
      .select('id,full_name,email,phone,status,locale,preferred_currency,last_login_at,created_at')
      .eq('id', userId)
      .maybeSingle(),
    db.from('user_roles').select('roles(key)').eq('profile_id', userId),
    db
      .from('vendors')
      .select(
        'id,business_name,slug,biography,base_city,website,status,visibility,avg_rating,review_count,created_at',
      )
      .eq('owner_id', userId)
      .maybeSingle(),
  ]);

  const profile = (profileResult.data ?? null) as ProfileRow | null;
  const vendor = (vendorResult.data ?? null) as VendorRow | null;

  const roles = ((roleResult.data ?? []) as { roles: { key: string } | null }[])
    .map((r) => r.roles?.key)
    .filter((key): key is string => Boolean(key));

  const recent = { ascending: false } as const;

  const [
    events,
    bookings,
    quotations,
    payments,
    reviews,
    messages,
    notifications,
    logins,
    erasures,
  ] = await Promise.all([
    fetchRows<EventRow>(() =>
      db
        .from('events')
        .select('title,event_type,event_date,location,status,is_public,created_at')
        .eq('posted_by', userId)
        .order('created_at', recent)
        .limit(SECTION_LIMIT),
    ),
    fetchRows<BookingRow>(() =>
      db
        .from('bookings')
        .select(
          'reference_no,status,event_date,location,currency,amount,created_at,vendors(business_name)',
        )
        .order('created_at', recent)
        .limit(SECTION_LIMIT),
    ),
    fetchRows<QuotationRow>(() =>
      db
        .from('quotations')
        .select('reference_no,status,currency,total,valid_until,created_at,vendors(business_name)')
        .order('created_at', recent)
        .limit(SECTION_LIMIT),
    ),
    fetchRows<PaymentRow>(() =>
      db
        .from('payments')
        .select(
          'purpose,provider,provider_method,provider_ref,amount,currency,status,paid_at,created_at',
        )
        .eq('payer_id', userId)
        .order('created_at', recent)
        .limit(SECTION_LIMIT),
    ),
    fetchRows<ReviewRow>(() =>
      db
        .from('reviews')
        .select('rating,title,body,status,created_at,vendors(business_name)')
        .eq('client_id', userId)
        .order('created_at', recent)
        .limit(SECTION_LIMIT),
    ),
    fetchRows<MessageRow>(() =>
      db
        .from('messages')
        .select('body,is_system,created_at,sender_id,conversations(subject,type)')
        .order('created_at', recent)
        .limit(SECTION_LIMIT),
    ),
    fetchRows<NotificationRow>(() =>
      db
        .from('notifications')
        .select('title,body,channel,read_at,created_at')
        .eq('recipient_id', userId)
        .order('created_at', recent)
        .limit(SECTION_LIMIT),
    ),
    fetchRows<LoginRow>(() =>
      db
        .from('login_history')
        .select('ip_address,user_agent,success,is_new_device,occurred_at')
        .eq('profile_id', userId)
        .order('occurred_at', recent)
        .limit(SECTION_LIMIT),
    ),
    fetchRows<ErasureRow>(() =>
      db
        .from('erasure_requests')
        .select('status,notes,created_at')
        .eq('profile_id', userId)
        .order('created_at', recent)
        .limit(SECTION_LIMIT),
    ),
  ]);

  const vendorSections = vendor
    ? await Promise.all([
        fetchRows<ServiceRow>(() =>
          db
            .from('vendor_services')
            .select('title,description,base_price,currency,is_active')
            .eq('vendor_id', vendor.id)
            .order('created_at', recent)
            .limit(SECTION_LIMIT),
        ),
        fetchRows<PayoutRow>(() =>
          db
            .from('payouts')
            .select('amount,currency,status,provider_ref,completed_at,created_at')
            .eq('vendor_id', vendor.id)
            .order('created_at', recent)
            .limit(SECTION_LIMIT),
        ),
        fetchRows<SubscriptionRow>(() =>
          db
            .from('subscriptions')
            .select(
              'status,current_period_start,current_period_end,auto_renew,cancelled_at,pricing_plans(name)',
            )
            .eq('vendor_id', vendor.id)
            .order('created_at', recent)
            .limit(SECTION_LIMIT),
        ),
      ])
    : [empty<ServiceRow>(), empty<PayoutRow>(), empty<SubscriptionRow>()];

  return {
    profile: profile ?? null,
    roles,
    vendor: vendor ?? null,
    events,
    bookings,
    quotations,
    payments,
    reviews,
    messages,
    notifications,
    logins,
    erasures,
    services: vendorSections[0],
    payouts: vendorSections[1],
    subscriptions: vendorSections[2],
  };
}
