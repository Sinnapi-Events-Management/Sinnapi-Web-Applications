import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { SortModel } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { applyFilters, paginate, type PageParams, type Paged } from '@/lib/table';
import {
  INTAKE_STATUSES,
  VENDOR_STATUSES,
  EVENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  type IntakeStatus,
  type VendorAdminStatus,
  type EventStatus,
  type SubscriptionStatus,
  type ProfileStatus,
} from '@/lib/status';
import type {
  ProfileModel,
  IntakeListModel,
  IntakeDetailModel,
  VendorAdminModel,
  VendorDetailModel,
  VendorKpis,
  VendorPaymentModel,
  ReviewModel,
  UserModel,
  ClientKpis,
  EngagedVendor,
  RoleModel,
  PermissionModel,
  EscrowModel,
  PayoutModel,
  RefundModel,
  DisputeModel,
  PaymentModel,
  LedgerEntryModel,
  SubscriptionAdminModel,
  PlanModel,
  PlanDetailModel,
  PlanKpis,
  BookingModel,
  QuotationModel,
  EventModel,
  EventDetailModel,
  ReviewReportModel,
  MessageFlagModel,
  NotificationTemplateModel,
  SettingModel,
  AuditLogModel,
  RetentionPolicyModel,
  ErasureRequestModel,
  ConversationModel,
  MessageModel,
  NotificationModel,
  EventInterestModel,
  EventQuotationModel,
  EventEngagementKpis,
  QuotationDocument,
} from '@/lib/types';

// Reads are RLS-gated by the admin's permissions (UI also hides via RBAC).
// A head+count query resolves to a result carrying only `count`.
const count = (q: PromiseLike<{ count: number | null }>): Promise<number> =>
  Promise.resolve(q).then((r) => r.count ?? 0);

// Shared react-query options for a server-paginated list: the page params are
// part of the key (so each page/sort caches independently) and the previous
// page stays visible while the next one loads.
function pagedOptions<Row>(key: string, params: PageParams, fetcher: () => Promise<Paged<Row>>) {
  return {
    // `filters` is part of the key so changing a filter refetches rather than
    // serving another filter's cached page. React Query hashes it stably, and
    // it stays `undefined` for lists that don't filter — leaving their keys
    // (and caches) unchanged.
    queryKey: [key, params.page, params.pageSize, params.sort, params.filters] as const,
    queryFn: fetcher,
    placeholderData: keepPreviousData,
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,email,avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      return (data as ProfileModel) ?? null;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread'],
    queryFn: async () =>
      count(
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null),
      ),
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [apps, payouts, disputes, escrow, vendors] = await Promise.all([
        count(
          // Pending = intake submissions awaiting or under compliance review.
          supabase
            .from('vendor_application_intake')
            .select('id', { count: 'exact', head: true })
            .in('status', ['submitted', 'reviewing']),
        ),
        count(
          supabase
            .from('payouts')
            .select('id', { count: 'exact', head: true })
            .in('status', ['requested', 'approved', 'processing']),
        ),
        count(
          supabase
            .from('disputes')
            .select('id', { count: 'exact', head: true })
            .in('status', ['open', 'under_review', 'awaiting_evidence']),
        ),
        count(
          supabase
            .from('escrow_transactions')
            .select('id', { count: 'exact', head: true })
            .in('status', ['held', 'release_requested', 'admin_review']),
        ),
        count(
          supabase
            .from('vendors')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
        ),
      ]);
      return {
        pendingApplications: apps,
        pendingPayouts: payouts,
        openDisputes: disputes,
        escrowHeld: escrow,
        activeVendors: vendors,
      };
    },
  });
}

// Everything the paginated Applications query needs: a page + sort + the
// free-text search and status tab. `status` is `undefined` on the "All" tab.
export type IntakeAdminParams = {
  page: number;
  pageSize: number;
  sort?: SortModel;
  /** Debounced term matched against business name, owner name/email and city. */
  search?: string;
  status?: string;
};

// The admin "Applications" queue reads the public intake table (anonymous
// submissions from the web-public "Become a vendor" form). Approved intakes are
// promoted into `vendor_applications` by the promote-intake Edge Function. The
// `search_intake_admin` RPC does search + status filter + sort + paginate +
// count server-side, returning each row with a window `total_count`.
export function useApplications(params: IntakeAdminParams) {
  return useQuery({
    queryKey: ['intake', params] as const,
    queryFn: async (): Promise<Paged<IntakeListModel>> => {
      const { data, error } = await supabase.rpc('search_intake_admin', {
        p_search: params.search ?? null,
        p_status: params.status ?? null,
        p_sort_field: params.sort?.field ?? 'created_at',
        p_sort_dir: params.sort?.direction ?? 'desc',
        p_limit: params.pageSize,
        p_offset: params.page * params.pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as (IntakeListModel & { total_count: number | string })[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
    placeholderData: keepPreviousData,
  });
}

/** Row count per intake status, plus `all` — drives the review queue's tabs. */
export type IntakeCounts = Record<IntakeStatus | 'all', number>;

/**
 * Per-status counts for the queue tabs. The RPC honours the active search but
 * NOT status, so each badge reflects what its tab would show once selected.
 * Shares the `intake` key prefix, so the detail page's existing invalidation
 * refreshes these badges after a triage decision.
 */
export function useApplicationCounts(search?: string) {
  return useQuery({
    queryKey: ['intake', 'counts', search] as const,
    queryFn: async (): Promise<IntakeCounts> => {
      const { data, error } = await supabase.rpc('count_intake_admin_by_status', {
        p_search: search ?? null,
      });
      if (error) throw error;
      const byStatus = (data ?? []) as { status: IntakeStatus; count: number | string }[];
      const base = INTAKE_STATUSES.reduce(
        (acc, status) => ({ ...acc, [status]: 0 }),
        {} as IntakeCounts,
      );
      return byStatus.reduce(
        (acc, { status, count }) => {
          const n = Number(count);
          acc[status] = n;
          acc.all += n;
          return acc;
        },
        { ...base, all: 0 },
      );
    },
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['intake', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendor_application_intake')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return (data as IntakeDetailModel) ?? null;
    },
  });
}

// Non-status filters for the admin Vendors list. Every field is optional; an
// omitted field means "no constraint on that dimension". `status` is tracked
// separately (see `VendorAdminParams`) because the status tabs and their count
// badges consume it differently from the free-text/attribute filters.
export type VendorAdminFilters = {
  /** Debounced free-text term matched against business name + city. */
  search?: string;
  /** `vendor_visibility` value, or `undefined` for any. */
  visibility?: string;
  /** Lower bound on `avg_rating`, or `undefined` for any. */
  minRating?: number;
  /** `true` to show only featured vendors; `undefined` for any. */
  featured?: boolean;
};

/** Everything the paginated Vendors query needs: a page + sort + all filters. */
export type VendorAdminParams = VendorAdminFilters & {
  page: number;
  pageSize: number;
  sort?: SortModel;
  /** `vendor_status` value, or `undefined` for the "All" tab. */
  status?: string;
};

// Deleting a vendor is a soft delete — a database trigger stamps `deleted_at`
// and cancels the physical delete. The `search_vendors_admin` RPC already
// excludes tombstoned rows and does search + filter + sort + paginate + count
// server-side, returning each row with a window `total_count`, so the whole
// list is one round trip regardless of which controls are active.
export function useVendorsAdmin(params: VendorAdminParams) {
  return useQuery({
    queryKey: ['admin-vendors', params] as const,
    queryFn: async (): Promise<Paged<VendorAdminModel>> => {
      const { data, error } = await supabase.rpc('search_vendors_admin', {
        p_search: params.search ?? null,
        p_status: params.status ?? null,
        p_visibility: params.visibility ?? null,
        p_min_rating: params.minRating ?? null,
        p_featured: params.featured ?? null,
        p_sort_field: params.sort?.field ?? 'created_at',
        p_sort_dir: params.sort?.direction ?? 'desc',
        p_limit: params.pageSize,
        p_offset: params.page * params.pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as (VendorAdminModel & { total_count: number | string })[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
    placeholderData: keepPreviousData,
  });
}

/** Row count per vendor status, plus `all` — drives the Vendors list' tabs. */
export type VendorAdminCounts = Record<VendorAdminStatus | 'all', number>;

/**
 * Per-status counts for the tab badges. The RPC honours every filter EXCEPT
 * status, so each badge reflects what that tab would show once selected. Shares
 * the `admin-vendors` key prefix so a status/edit/delete mutation's existing
 * invalidation refreshes the badges alongside the list.
 */
export function useVendorAdminStatusCounts(filters: VendorAdminFilters) {
  return useQuery({
    queryKey: ['admin-vendors', 'counts', filters] as const,
    queryFn: async (): Promise<VendorAdminCounts> => {
      const { data, error } = await supabase.rpc('count_vendors_admin_by_status', {
        p_search: filters.search ?? null,
        p_visibility: filters.visibility ?? null,
        p_min_rating: filters.minRating ?? null,
        p_featured: filters.featured ?? null,
      });
      if (error) throw error;
      const byStatus = (data ?? []) as { status: VendorAdminStatus; count: number | string }[];
      const base = VENDOR_STATUSES.reduce(
        (acc, status) => ({ ...acc, [status]: 0 }),
        {} as VendorAdminCounts,
      );
      return byStatus.reduce(
        (acc, { status, count }) => {
          const n = Number(count);
          acc[status] = n;
          acc.all += n;
          return acc;
        },
        { ...base, all: 0 },
      );
    },
  });
}

// --- single vendor + related collections (detail page) ----------------------

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendor', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(
          'id,business_name,slug,biography,base_city,website,years_in_operation,pricing_model,' +
            'starting_price,starting_price_currency,profile_image_url,primary_image_url,status,' +
            'visibility,is_featured,avg_rating,review_count,trial_ends_at,created_at,' +
            'owner:profiles!owner_id(full_name,email,phone),category:service_categories!primary_category_id(name)',
        )
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data as unknown as VendorDetailModel;
    },
  });
}

// Headline counts for the KPI cards. Payments have no direct vendor_id — they
// join through the booking, so we count via an inner-joined booking filter.
export function useVendorKpis(id: string) {
  return useQuery({
    queryKey: ['vendor-kpis', id],
    enabled: !!id,
    queryFn: async (): Promise<VendorKpis> => {
      const [bookings, quotations, payments, payouts] = await Promise.all([
        count(
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', id),
        ),
        count(
          supabase
            .from('quotations')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', id),
        ),
        count(
          supabase
            .from('payments')
            .select('id,bookings!inner(vendor_id)', { count: 'exact', head: true })
            .eq('bookings.vendor_id', id),
        ),
        count(
          supabase.from('payouts').select('id', { count: 'exact', head: true }).eq('vendor_id', id),
        ),
      ]);
      return { bookings, quotations, payments, payouts };
    },
  });
}

export function useVendorBookings(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`vendor-bookings:${id}`, params, () =>
      paginate<BookingModel>(
        supabase
          .from('bookings')
          .select('id,reference_no,status,event_date,amount,currency', { count: 'exact' })
          .eq('vendor_id', id),
        params,
        { field: 'event_date', ascending: false },
      ),
    ),
  );
}

export function useVendorQuotations(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`vendor-quotations:${id}`, params, () =>
      paginate<QuotationModel>(
        supabase
          .from('quotations')
          .select('id,reference_no,status,total,currency,created_at', { count: 'exact' })
          .eq('vendor_id', id),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function useVendorPayments(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`vendor-payments:${id}`, params, () =>
      paginate<VendorPaymentModel>(
        supabase
          .from('payments')
          .select(
            'id,purpose,amount,currency,status,provider,provider_method,created_at,bookings!inner(reference_no,vendor_id)',
            { count: 'exact' },
          )
          .eq('bookings.vendor_id', id),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function useVendorPayouts(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`vendor-payouts:${id}`, params, () =>
      paginate<PayoutModel>(
        supabase
          .from('payouts')
          .select('id,amount,currency,status,requested_by,approved_by,created_at', {
            count: 'exact',
          })
          .eq('vendor_id', id),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function useVendorEscrow(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`vendor-escrow:${id}`, params, () =>
      paginate<EscrowModel>(
        supabase
          .from('escrow_transactions')
          .select(
            'id,status,gross_amount,commission_amount,net_payout_amount,currency,client_confirmed_at,bookings(reference_no)',
            { count: 'exact' },
          )
          .eq('vendor_id', id),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function useVendorReviews(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`vendor-reviews:${id}`, params, () =>
      paginate<ReviewModel>(
        supabase
          .from('reviews')
          .select('id,rating,title,body,status,created_at', { count: 'exact' })
          .eq('vendor_id', id),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

// A profile is Sinnapi *staff* iff it holds at least one is_admin role. Staff
// numbers are small, so resolving the id set in a separate query and filtering
// `profiles` with `.in()` is both correct — a join would fan out multi-role
// staff and inflate the exact count — and cheap. It also keeps the Users page
// scoped to staff, leaving clients/vendors to their own future pages.
async function staffProfileIds(): Promise<string[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('profile_id, roles!inner(is_admin)')
    .eq('roles.is_admin', true);
  return [...new Set((data ?? []).map((r) => r.profile_id as string))];
}

// `profiles` has two FKs from `user_roles` (profile_id and granted_by), so the
// embed must name the one we want — the role assignment — or PostgREST throws
// PGRST201 (ambiguous relationship) and the whole query fails.
const USER_SELECT =
  'id,full_name,first_name,middle_name,last_name,email,phone,status,created_at,user_roles!user_roles_profile_id_fkey(roles(id,key,name,is_admin))';

// Case-insensitive "contains" across name + email, with the PostgREST logical
// operators a user might type stripped so a search term can't rewrite the query.
function userSearchClause(search: string): string {
  const s = `%${search.replace(/[%,()]/g, '')}%`;
  return `full_name.ilike.${s},email.ilike.${s}`;
}

// Staff list: soft-deleted rows are excluded, and status / free-text search
// arrive via `params.filters` so they're part of the react-query cache key.
export function useUsers(params: PageParams) {
  return useQuery(
    pagedOptions('users', params, async () => {
      const f = params.filters ?? {};
      const ids = await staffProfileIds();
      if (ids.length === 0) return { rows: [], total: 0 };
      let q = supabase
        .from('profiles')
        .select(USER_SELECT, { count: 'exact' })
        .is('deleted_at', null)
        .in('id', ids);
      if (f.status) q = q.eq('status', f.status);
      if (f.search) q = q.or(userSearchClause(f.search));
      return paginate<UserModel>(q, params, { field: 'created_at', ascending: false });
    }),
  );
}

export type UserStatusCounts = { all?: number } & Partial<Record<ProfileStatus, number>>;

// Per-status badges for the Users tabs. Mirrors the list's staff scope + search
// so the counts always match what the table can show.
export function useUserStatusCounts(search?: string) {
  return useQuery({
    queryKey: ['user-status-counts', search ?? null],
    queryFn: async (): Promise<UserStatusCounts> => {
      const ids = await staffProfileIds();
      if (ids.length === 0) return { all: 0, active: 0, suspended: 0, pending: 0 };
      const base = () => {
        let q = supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in('id', ids);
        if (search) q = q.or(userSearchClause(search));
        return q;
      };
      const [all, active, suspended, pending] = await Promise.all([
        count(base()),
        count(base().eq('status', 'active')),
        count(base().eq('status', 'suspended')),
        count(base().eq('status', 'pending')),
      ]);
      return { all, active, suspended, pending };
    },
  });
}

// ─── Clients ──────────────────────────────────────────────────────────────
// "Clients" are self-registered non-staff accounts: the client + event_planner
// roles. Same two-step id-scoping as staff (see staffProfileIds) keeps the count
// exact and leaves clients cleanly separated from staff/vendors.
async function clientProfileIds(): Promise<string[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('profile_id, roles!inner(key)')
    .in('roles.key', ['client', 'event_planner']);
  return [...new Set((data ?? []).map((r) => r.profile_id as string))];
}

// Same two-FK disambiguation as USER_SELECT (see note there).
const CLIENT_SELECT =
  'id,full_name,first_name,middle_name,last_name,email,phone,status,created_at,user_roles!user_roles_profile_id_fkey(roles(id,key,name,is_admin))';

export function useClients(params: PageParams) {
  return useQuery(
    pagedOptions('clients', params, async () => {
      const f = params.filters ?? {};
      const ids = await clientProfileIds();
      if (ids.length === 0) return { rows: [], total: 0 };
      let q = supabase
        .from('profiles')
        .select(CLIENT_SELECT, { count: 'exact' })
        .is('deleted_at', null)
        .in('id', ids);
      if (f.status) q = q.eq('status', f.status);
      if (f.search) q = q.or(userSearchClause(f.search));
      return paginate<UserModel>(q, params, { field: 'created_at', ascending: false });
    }),
  );
}

export function useClientStatusCounts(search?: string) {
  return useQuery({
    queryKey: ['client-status-counts', search ?? null],
    queryFn: async (): Promise<UserStatusCounts> => {
      const ids = await clientProfileIds();
      if (ids.length === 0) return { all: 0, active: 0, suspended: 0, pending: 0 };
      const base = () => {
        let q = supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in('id', ids);
        if (search) q = q.or(userSearchClause(search));
        return q;
      };
      const [all, active, suspended, pending] = await Promise.all([
        count(base()),
        count(base().eq('status', 'active')),
        count(base().eq('status', 'suspended')),
        count(base().eq('status', 'pending')),
      ]);
      return { all, active, suspended, pending };
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(CLIENT_SELECT)
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data as unknown as UserModel;
    },
  });
}

export function useClientKpis(id: string) {
  return useQuery({
    queryKey: ['client-kpis', id],
    enabled: !!id,
    queryFn: async (): Promise<ClientKpis> => {
      const [bookings, events, quotations, bVendors, qVendors] = await Promise.all([
        count(
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', id),
        ),
        count(
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('posted_by', id)
            .is('deleted_at', null),
        ),
        count(
          supabase
            .from('quotations')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', id),
        ),
        supabase.from('bookings').select('vendor_id').eq('client_id', id).is('deleted_at', null),
        supabase.from('quotations').select('vendor_id').eq('client_id', id),
      ]);
      const vendorIds = new Set<string>();
      for (const r of bVendors.data ?? []) vendorIds.add(r.vendor_id as string);
      for (const r of qVendors.data ?? []) vendorIds.add(r.vendor_id as string);
      return { bookings, events, quotations, vendors: vendorIds.size };
    },
  });
}

export function useClientBookings(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`client-bookings:${id}`, params, () =>
      paginate<BookingModel>(
        supabase
          .from('bookings')
          .select(
            'id,reference_no,status,event_date,amount,currency,vendors:vendor_id(business_name)',
            {
              count: 'exact',
            },
          )
          .eq('client_id', id)
          .is('deleted_at', null),
        params,
        { field: 'event_date', ascending: false },
      ),
    ),
  );
}

export function useClientQuotations(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`client-quotations:${id}`, params, () =>
      paginate<QuotationModel>(
        supabase
          .from('quotations')
          .select(
            'id,reference_no,status,total,currency,created_at,vendors:vendor_id(business_name)',
            {
              count: 'exact',
            },
          )
          .eq('client_id', id),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function useClientEvents(id: string, params: PageParams) {
  return useQuery(
    pagedOptions(`client-events:${id}`, params, () =>
      paginate<EventModel>(
        supabase
          .from('events')
          .select('id,title,source,status,event_date,is_public,created_at', { count: 'exact' })
          .eq('posted_by', id)
          .is('deleted_at', null),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

// Distinct vendors the client has engaged, merged from bookings + quotations.
export function useClientVendors(id: string) {
  return useQuery({
    queryKey: ['client-vendors', id],
    enabled: !!id,
    queryFn: async (): Promise<EngagedVendor[]> => {
      const sel = 'vendor:vendor_id(id,business_name,profile_image_url,status)';
      const [b, q] = await Promise.all([
        supabase.from('bookings').select(sel).eq('client_id', id).is('deleted_at', null),
        supabase.from('quotations').select(sel).eq('client_id', id),
      ]);
      const byId = new Map<string, EngagedVendor>();
      for (const row of [...(b.data ?? []), ...(q.data ?? [])]) {
        const v = (row as { vendor: EngagedVendor | EngagedVendor[] | null }).vendor;
        const vendor = Array.isArray(v) ? v[0] : v;
        if (vendor?.id) byId.set(vendor.id, vendor);
      }
      return [...byId.values()];
    },
  });
}

// Resolve (find-or-create) the admin↔client conversation, then hand the id to the
// shared messaging queries. RLS blocks creating conversations from the browser,
// so this goes through a SECURITY DEFINER RPC (see 0023 migration).
export function useClientAdminConversation(clientId: string) {
  return useQuery({
    queryKey: ['client-admin-conversation', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('get_or_create_client_admin_conversation', {
        p_client_id: clientId,
      });
      if (error) throw error;
      return data as string;
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('roles')
        .select('id,key,name,is_admin,role_permissions(permission_id)')
        .order('name');
      return (data ?? []) as RoleModel[];
    },
  });
}

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('permissions')
        .select('id,key,category,description')
        .order('category');
      return (data ?? []) as PermissionModel[];
    },
  });
}

export function useEscrowAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-escrow', params, () =>
      paginate<EscrowModel>(
        supabase
          .from('escrow_transactions')
          .select(
            'id,status,gross_amount,commission_amount,net_payout_amount,currency,client_confirmed_at,vendors(business_name),bookings(reference_no)',
            { count: 'exact' },
          ),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function usePayoutsAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-payouts', params, () =>
      paginate<PayoutModel>(
        supabase
          .from('payouts')
          .select(
            'id,amount,currency,status,requested_by,approved_by,created_at,vendors(business_name)',
            { count: 'exact' },
          ),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function useRefundsAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-refunds', params, () =>
      paginate<RefundModel>(
        supabase
          .from('refunds')
          .select('id,amount,currency,type,status,reason,requested_by,created_at', {
            count: 'exact',
          }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function useDisputesAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-disputes', params, () =>
      paginate<DisputeModel>(
        supabase
          .from('disputes')
          .select('id,reason,status,sla_due_at,created_at,escrow_id,bookings(reference_no)', {
            count: 'exact',
          }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function usePaymentsAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-payments', params, () =>
      paginate<PaymentModel>(
        supabase
          .from('payments')
          .select('id,purpose,amount,currency,status,provider,provider_method,created_at', {
            count: 'exact',
          }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

export function useLedger(params: PageParams) {
  return useQuery(
    pagedOptions('ledger', params, () =>
      paginate<LedgerEntryModel>(
        supabase
          .from('ledger_entries')
          .select('id,entry_group_id,account,direction,amount,currency,description,occurred_at', {
            count: 'exact',
          }),
        params,
        { field: 'occurred_at', ascending: false },
      ),
    ),
  );
}

// Non-status filters for the admin Subscriptions list. `status` is tracked
// separately (see `SubscriptionAdminParams`) because the status tabs and their
// count badges consume it differently from the free-text/attribute filters.
export type SubscriptionAdminFilters = {
  /** Debounced free-text term matched against the vendor's business name. */
  search?: string;
  /** `pricing_plans.id` to narrow by plan, or `undefined` for any plan. */
  planId?: string;
  /** `true` to show only subscriptions whose period ends within the window. */
  expiringSoon?: boolean;
};

/** Everything the paginated Subscriptions query needs: page + sort + filters. */
export type SubscriptionAdminParams = SubscriptionAdminFilters & {
  page: number;
  pageSize: number;
  sort?: SortModel;
  /** `subscription_status` value, or `undefined` for the "All" tab. */
  status?: string;
};

/** How soon a subscription must lapse to count as "expiring soon", in days. */
export const EXPIRING_SOON_DAYS = 30;

// One page of the admin Subscriptions list. Like `search_vendors_admin`, the
// `search_subscriptions_admin` RPC does search + filter + sort + paginate +
// count server-side (excluding soft-deleted rows) and returns each row with a
// window `total_count`, so the whole list is one round trip regardless of which
// controls are active. Plan filtering is `plan_id = p_plan_id`, so a plan-less
// subscription only ever shows under "any plan".
export function useSubscriptionsAdmin(params: SubscriptionAdminParams) {
  return useQuery({
    queryKey: ['admin-subscriptions', params] as const,
    queryFn: async (): Promise<Paged<SubscriptionAdminModel>> => {
      const { data, error } = await supabase.rpc('search_subscriptions_admin', {
        p_search: params.search ?? null,
        p_status: params.status ?? null,
        p_plan_id: params.planId ?? null,
        p_expiring_days: params.expiringSoon ? EXPIRING_SOON_DAYS : null,
        p_sort_field: params.sort?.field ?? 'current_period_end',
        p_sort_dir: params.sort?.direction ?? 'asc',
        p_limit: params.pageSize,
        p_offset: params.page * params.pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as (SubscriptionAdminModel & { total_count: number | string })[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
    placeholderData: keepPreviousData,
  });
}

/** Row count per subscription status, plus `all` — drives the list' tabs. */
export type SubscriptionAdminCounts = Record<SubscriptionStatus | 'all', number>;

/**
 * Per-status counts for the tab badges. The RPC honours every filter EXCEPT
 * status, so each badge reflects what that tab would show once selected. Shares
 * the `admin-subscriptions` key prefix so a list refresh refreshes the badges
 * alongside it.
 */
export function useSubscriptionAdminStatusCounts(filters: SubscriptionAdminFilters) {
  return useQuery({
    queryKey: ['admin-subscriptions', 'counts', filters] as const,
    queryFn: async (): Promise<SubscriptionAdminCounts> => {
      const { data, error } = await supabase.rpc('count_subscriptions_admin_by_status', {
        p_search: filters.search ?? null,
        p_plan_id: filters.planId ?? null,
        p_expiring_days: filters.expiringSoon ? EXPIRING_SOON_DAYS : null,
      });
      if (error) throw error;
      const byStatus = (data ?? []) as { status: SubscriptionStatus; count: number | string }[];
      const base = SUBSCRIPTION_STATUSES.reduce(
        (acc, status) => ({ ...acc, [status]: 0 }),
        {} as SubscriptionAdminCounts,
      );
      return byStatus.reduce(
        (acc, { status, count }) => {
          const n = Number(count);
          acc[status] = n;
          acc.all += n;
          return acc;
        },
        { ...base, all: 0 },
      );
    },
  });
}

/** A pricing plan reduced to what the Subscriptions plan filter needs. */
export type PricingPlanOption = { id: string; name: string };

/**
 * All pricing plans as filter options, active or not — a subscription can sit on
 * a since-retired plan, and hiding that plan would make those rows unfilterable.
 */
export function usePricingPlanOptions() {
  return useQuery({
    queryKey: ['pricing-plan-options'] as const,
    queryFn: async (): Promise<PricingPlanOption[]> => {
      const { data, error } = await supabase.rpc('list_pricing_plan_options');
      if (error) throw error;
      return (data ?? []) as PricingPlanOption[];
    },
  });
}

const PLAN_COLUMNS =
  'id,key,name,tagline,description,highlight,price,currency,billing_cycle,is_active,trial_days,sort_order,features';

export function usePlansAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-plans', params, () =>
      paginate<PlanModel>(
        applyFilters(
          supabase.from('pricing_plans').select(PLAN_COLUMNS, { count: 'exact' }),
          params.filters,
        ),
        params,
        { field: 'sort_order', ascending: true },
      ),
    ),
  );
}

/** A single plan by id — drives the plan detail page. */
export function usePlan(id: string) {
  return useQuery({
    queryKey: ['plan', id],
    enabled: !!id,
    queryFn: async (): Promise<PlanDetailModel> => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select(`${PLAN_COLUMNS},created_at,updated_at`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as PlanDetailModel;
    },
  });
}

// Subscriber counts for the plan detail KPI row. Each tile is a head+count
// query filtered to this plan; soft-deleted subscriptions are excluded so the
// numbers match the Subscriptions list.
export function usePlanKpis(id: string) {
  return useQuery({
    queryKey: ['plan-kpis', id],
    enabled: !!id,
    queryFn: async (): Promise<PlanKpis> => {
      const base = () =>
        supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('plan_id', id)
          .is('deleted_at', null);
      const [subscribers, active, trialing, expired] = await Promise.all([
        count(base()),
        count(base().eq('status', 'active')),
        count(base().eq('status', 'trialing')),
        count(base().eq('status', 'expired')),
      ]);
      return { subscribers, active, trialing, expired };
    },
  });
}

export function useBookingsAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-bookings', params, () =>
      paginate<BookingModel>(
        supabase
          .from('bookings')
          .select('id,reference_no,status,event_date,amount,currency,vendors(business_name)', {
            count: 'exact',
          }),
        params,
        { field: 'event_date', ascending: false },
      ),
    ),
  );
}

export function useQuotationsAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-quotations', params, () =>
      paginate<QuotationModel>(
        supabase
          .from('quotations')
          .select('id,reference_no,status,total,currency,created_at,vendors(business_name)', {
            count: 'exact',
          }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

// Non-status filters for the admin Events list. Every field is optional; an
// omitted field means "no constraint on that dimension". `status` is tracked
// separately (see `EventAdminParams`) because the status tabs and their count
// badges consume it differently from the free-text/attribute filters.
export type EventAdminFilters = {
  /** Debounced free-text term matched against title + location. */
  search?: string;
  /** `event_source` value ('admin' | 'client'), or `undefined` for any. */
  source?: string;
  /** `true`/`false` to constrain on `is_public`; `undefined` for any. */
  isPublic?: boolean;
  /** Inclusive lower bound on `event_date` (yyyy-mm-dd), or `undefined`. */
  dateFrom?: string;
  /** Inclusive upper bound on `event_date` (yyyy-mm-dd), or `undefined`. */
  dateTo?: string;
};

/** Everything the paginated Events query needs: a page + sort + all filters. */
export type EventAdminParams = EventAdminFilters & {
  page: number;
  pageSize: number;
  sort?: SortModel;
  /** `event_status` value, or `undefined` for the "All" tab. */
  status?: string;
};

// Deleting an event is a soft delete — a database trigger stamps `deleted_at`
// and cancels the physical delete. The `search_events_admin` RPC already
// excludes tombstoned rows and does search + filter + sort + paginate + count
// server-side, returning each row with a window `total_count`, so the whole
// list is one round trip regardless of which controls are active.
export function useEventsAdmin(params: EventAdminParams) {
  return useQuery({
    queryKey: ['admin-events', params] as const,
    queryFn: async (): Promise<Paged<EventModel>> => {
      const { data, error } = await supabase.rpc('search_events_admin', {
        p_search: params.search ?? null,
        p_status: params.status ?? null,
        p_source: params.source ?? null,
        p_is_public: params.isPublic ?? null,
        p_date_from: params.dateFrom ?? null,
        p_date_to: params.dateTo ?? null,
        p_sort_field: params.sort?.field ?? 'created_at',
        p_sort_dir: params.sort?.direction ?? 'desc',
        p_limit: params.pageSize,
        p_offset: params.page * params.pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as (EventModel & { total_count: number | string })[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
    placeholderData: keepPreviousData,
  });
}

/** Row count per event status, plus `all` — drives the Events list' tabs. */
export type EventAdminCounts = Record<EventStatus | 'all', number>;

/**
 * Per-status counts for the tab badges. The RPC honours every filter EXCEPT
 * status, so each badge reflects what that tab would show once selected. Shares
 * the `admin-events` key prefix so a create/edit/status/delete mutation's
 * existing invalidation refreshes the badges alongside the list.
 */
export function useEventAdminStatusCounts(filters: EventAdminFilters) {
  return useQuery({
    queryKey: ['admin-events', 'counts', filters] as const,
    queryFn: async (): Promise<EventAdminCounts> => {
      const { data, error } = await supabase.rpc('count_events_admin_by_status', {
        p_search: filters.search ?? null,
        p_source: filters.source ?? null,
        p_is_public: filters.isPublic ?? null,
        p_date_from: filters.dateFrom ?? null,
        p_date_to: filters.dateTo ?? null,
      });
      if (error) throw error;
      const byStatus = (data ?? []) as { status: EventStatus; count: number | string }[];
      const base = EVENT_STATUSES.reduce(
        (acc, status) => ({ ...acc, [status]: 0 }),
        {} as EventAdminCounts,
      );
      return byStatus.reduce(
        (acc, { status, count }) => {
          const n = Number(count);
          acc[status] = n;
          acc.all += n;
          return acc;
        },
        { ...base, all: 0 },
      );
    },
  });
}

/** The full editable event behind the edit drawer. `''` keeps it disabled. */
export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id,posted_by,source,title,description,event_type,event_date,location,' +
            'budget_min,budget_max,currency,status,is_public,cover_image_url,created_at,' +
            'poster:profiles!posted_by(full_name,email,phone)',
        )
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data as unknown as EventDetailModel;
    },
  });
}

// --- single event + related vendor engagement (detail page) -----------------
// The event detail page works the vendors that engaged with an event. Reads go
// through SECURITY DEFINER RPCs gated on `events.manage` because that admin has
// no direct RLS read on `quotations`/`quotation_items` and shouldn't need the
// finance grants just to triage an event. Each list returns a window
// `total_count`, so a page is one round trip (same contract as the admin lists).

/** Headline engagement counts (interested / shortlisted / declined / quotes). */
export function useEventEngagementKpis(id: string) {
  return useQuery({
    queryKey: ['event-engagement', id],
    enabled: !!id,
    queryFn: async (): Promise<EventEngagementKpis> => {
      const { data, error } = await supabase.rpc('event_engagement_counts', { p_event_id: id });
      if (error) throw error;
      const row = (data ?? [])[0] as Record<string, number | string> | undefined;
      return {
        interested: Number(row?.interested ?? 0),
        shortlisted: Number(row?.shortlisted ?? 0),
        declined: Number(row?.declined ?? 0),
        quotations: Number(row?.quotations ?? 0),
      };
    },
  });
}

/** Vendors that expressed interest in an event, server-paginated. */
export function useEventInterests(id: string, params: PageParams) {
  return useQuery({
    queryKey: ['event-interests', id, params] as const,
    enabled: !!id,
    queryFn: async (): Promise<Paged<EventInterestModel>> => {
      const { data, error } = await supabase.rpc('search_event_interests', {
        p_event_id: id,
        p_status: params.filters?.status ?? null,
        p_sort_field: params.sort?.field ?? 'created_at',
        p_sort_dir: params.sort?.direction ?? 'desc',
        p_limit: params.pageSize,
        p_offset: params.page * params.pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as (EventInterestModel & { total_count: number | string })[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
    placeholderData: keepPreviousData,
  });
}

/** Quotations submitted against an event, server-paginated. */
export function useEventQuotations(id: string, params: PageParams) {
  return useQuery({
    queryKey: ['event-quotations', id, params] as const,
    enabled: !!id,
    queryFn: async (): Promise<Paged<EventQuotationModel>> => {
      const { data, error } = await supabase.rpc('search_event_quotations', {
        p_event_id: id,
        p_status: params.filters?.status ?? null,
        p_sort_field: params.sort?.field ?? 'created_at',
        p_sort_dir: params.sort?.direction ?? 'desc',
        p_limit: params.pageSize,
        p_offset: params.page * params.pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as (EventQuotationModel & { total_count: number | string })[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
    placeholderData: keepPreviousData,
  });
}

/** Fetch the full quotation document (header + line items) for the PDF export. */
export async function fetchQuotationDocument(quotationId: string): Promise<QuotationDocument> {
  const { data, error } = await supabase.rpc('get_event_quotation', {
    p_quotation_id: quotationId,
  });
  if (error) throw error;
  return data as QuotationDocument;
}

export function useReviewReports() {
  return useQuery({
    queryKey: ['review-reports'],
    queryFn: async () => {
      const { data } = await supabase
        .from('review_reports')
        .select('id,reason,status,created_at,reviews(id,rating,body,vendor_id)')
        .order('created_at', { ascending: false });
      return (data ?? []) as ReviewReportModel[];
    },
  });
}

export function useMessageFlags() {
  return useQuery({
    queryKey: ['message-flags'],
    queryFn: async () => {
      const { data } = await supabase
        .from('message_flags')
        .select('id,reason,status,created_at,messages(id,body,conversation_id)')
        .order('created_at', { ascending: false });
      return (data ?? []) as MessageFlagModel[];
    },
  });
}

// Case-insensitive "contains" across the fields an admin scans by, with the
// PostgREST logical operators a user might type stripped so a search term can't
// rewrite the query.
function templateSearchClause(search: string): string {
  const s = `%${search.replace(/[%,()]/g, '')}%`;
  return `trigger_key.ilike.${s},subject.ilike.${s}`;
}

// Notification templates: channel filter + free-text search arrive via
// `params.filters` so they're part of the react-query cache key, and filtering
// happens server-side so the `exact` count keeps pagination honest.
export function useNotificationTemplates(params: PageParams) {
  return useQuery(
    pagedOptions('notification-templates', params, () => {
      const f = params.filters ?? {};
      let q = supabase
        .from('notification_templates')
        .select('id,trigger_key,channel,subject,locale,is_active', { count: 'exact' });
      if (f.channel) q = q.eq('channel', f.channel);
      if (f.search) q = q.or(templateSearchClause(f.search));
      return paginate<NotificationTemplateModel>(q, params, {
        field: 'trigger_key',
        ascending: true,
      });
    }),
  );
}

export type NotificationTemplateStats = {
  all: number;
  email: number;
  in_app: number;
  active: number;
};

// KPI + tab-badge counts for the templates page. Mirrors the list's search so
// the tiles and channel tabs always match what the table can show.
export function useNotificationTemplateStats(search?: string) {
  return useQuery({
    queryKey: ['notification-template-stats', search ?? null] as const,
    queryFn: async (): Promise<NotificationTemplateStats> => {
      const base = () => {
        let q = supabase
          .from('notification_templates')
          .select('id', { count: 'exact', head: true });
        if (search) q = q.or(templateSearchClause(search));
        return q;
      };
      const [all, email, inApp, active] = await Promise.all([
        count(base()),
        count(base().eq('channel', 'email')),
        count(base().eq('channel', 'in_app')),
        count(base().eq('is_active', true)),
      ]);
      return { all, email, in_app: inApp, active };
    },
  });
}

export function useSettings(params: PageParams) {
  return useQuery(
    pagedOptions('settings', params, () =>
      paginate<SettingModel>(
        supabase.from('platform_settings').select('id,key,value,description', { count: 'exact' }),
        params,
        { field: 'key', ascending: true },
      ),
    ),
  );
}

// Embeds the actor profile (with its roles) and the before/after row snapshots
// so the UI can render human names, roles, and what actually changed instead of
// bare UUIDs. `profiles!actor_id` disambiguates the single FK to profiles; the
// nested `user_roles!..._profile_id_fkey` picks the assignment FK (not granted_by).
const AUDIT_SELECT =
  'id,action,entity_type,entity_id,actor_id,occurred_at,before,after,' +
  'actor:profiles!actor_id(id,full_name,email,' +
  'user_roles!user_roles_profile_id_fkey(roles(id,key,name,is_admin)))';

export function useAuditLogs(params: PageParams) {
  return useQuery(
    pagedOptions('audit', params, () => {
      const f = params.filters ?? {};
      let query = supabase.from('audit_logs').select(AUDIT_SELECT, { count: 'exact' });
      // `op` matches the auto-generated `${op}_${table}` action prefix.
      if (f.op) query = query.like('action', `${f.op}_%`);
      if (f.entity_type) query = query.eq('entity_type', f.entity_type);
      if (f.actor === 'system') query = query.is('actor_id', null);
      else if (f.actor === 'people') query = query.not('actor_id', 'is', null);
      if (f.from) query = query.gte('occurred_at', f.from);
      if (f.to) query = query.lte('occurred_at', f.to);
      return paginate<AuditLogModel>(query, params, { field: 'occurred_at', ascending: false });
    }),
  );
}

export function useRetention(params: PageParams) {
  return useQuery(
    pagedOptions('retention', params, () =>
      paginate<RetentionPolicyModel>(
        supabase
          .from('data_retention_policies')
          .select('id,data_category,retention_period,action_on_expiry,legal_hold,description', {
            count: 'exact',
          }),
        params,
        { field: 'data_category', ascending: true },
      ),
    ),
  );
}

export function useErasureRequests(params: PageParams) {
  return useQuery(
    pagedOptions('erasure', params, () =>
      paginate<ErasureRequestModel>(
        supabase
          .from('erasure_requests')
          .select('id,status,notes,created_at,profiles:profile_id(full_name,email)', {
            count: 'exact',
          }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

// shared inbox
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id,type,subject,last_message_at,status')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      return (data ?? []) as ConversationModel[];
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('id,sender_id,body,created_at,moderation_status')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      return (data ?? []) as MessageModel[];
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id,trigger_key,title,body,read_at,created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data ?? []) as NotificationModel[];
    },
  });
}
