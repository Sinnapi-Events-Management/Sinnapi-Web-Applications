import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { applyFilters, paginate, type PageParams, type Paged } from '@/lib/table';
import { INTAKE_STATUSES, type IntakeStatus } from '@/lib/status';
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
  RoleModel,
  PermissionModel,
  EscrowModel,
  PayoutModel,
  RefundModel,
  DisputeModel,
  PaymentModel,
  LedgerEntryModel,
  SubscriptionModel,
  PlanModel,
  BookingModel,
  QuotationModel,
  EventModel,
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

// The admin "Applications" queue reads the public intake table (anonymous
// submissions from the web-public "Become a vendor" form). Approved intakes are
// promoted into `vendor_applications` by the promote-intake Edge Function.
export function useApplications(params: PageParams) {
  return useQuery(
    pagedOptions('intake', params, () =>
      paginate<IntakeListModel>(
        applyFilters(
          supabase
            .from('vendor_application_intake')
            .select('id,business_name,status,owner_full_name,owner_email,created_at', {
              count: 'exact',
            }),
          params.filters,
        ),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

/** Row count per intake status, plus `all` — drives the review queue's tabs. */
export type IntakeCounts = Record<IntakeStatus | 'all', number>;

function intakeCount(status?: IntakeStatus) {
  const query = supabase
    .from('vendor_application_intake')
    .select('id', { count: 'exact', head: true });
  return status ? query.eq('status', status) : query;
}

/**
 * Head-only counts (no rows transferred) for the queue tabs. `all` is counted
 * separately rather than summed so it stays correct if a status outside
 * `INTAKE_STATUSES` ever lands in the table. Shares the `intake` key prefix, so
 * the detail page's existing invalidation refreshes these badges after a
 * triage decision.
 */
export function useApplicationCounts() {
  return useQuery({
    queryKey: ['intake', 'counts'] as const,
    queryFn: async (): Promise<IntakeCounts> => {
      const [all, ...byStatus] = await Promise.all([
        intakeCount(),
        ...INTAKE_STATUSES.map((status) => intakeCount(status)),
      ]);
      return INTAKE_STATUSES.reduce(
        (acc, status, i) => ({ ...acc, [status]: byStatus[i].count ?? 0 }),
        { all: all.count ?? 0 } as IntakeCounts,
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

// Deleting a vendor is a soft delete — a database trigger stamps `deleted_at`
// and cancels the physical delete — so both vendor reads must exclude the
// tombstoned rows, or a "deleted" vendor keeps showing up here.
export function useVendorsAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-vendors', params, () =>
      paginate<VendorAdminModel>(
        supabase
          .from('vendors')
          .select(
            'id,business_name,slug,status,visibility,avg_rating,review_count,profile_image_url,base_city,created_at',
            { count: 'exact' },
          )
          .is('deleted_at', null),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
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

export function useUsers(params: PageParams) {
  return useQuery(
    pagedOptions('users', params, () =>
      paginate<UserModel>(
        supabase
          .from('profiles')
          .select('id,full_name,email,status,created_at,user_roles(roles(key,name))', {
            count: 'exact',
          }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
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

export function useSubscriptionsAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-subscriptions', params, () =>
      paginate<SubscriptionModel>(
        supabase
          .from('subscriptions')
          .select(
            'id,status,current_period_end,grace_until,trial_ends_at,vendors(business_name),pricing_plans(name)',
            { count: 'exact' },
          ),
        params,
        { field: 'current_period_end', ascending: true },
      ),
    ),
  );
}

export function usePlansAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-plans', params, () =>
      paginate<PlanModel>(
        supabase
          .from('pricing_plans')
          .select('id,key,name,price,currency,billing_cycle,is_active,trial_days', {
            count: 'exact',
          }),
        params,
        { field: 'sort_order', ascending: true },
      ),
    ),
  );
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

export function useEventsAdmin(params: PageParams) {
  return useQuery(
    pagedOptions('admin-events', params, () =>
      paginate<EventModel>(
        supabase
          .from('events')
          .select('id,title,source,status,event_date,is_public,created_at', { count: 'exact' }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
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

export function useNotificationTemplates(params: PageParams) {
  return useQuery(
    pagedOptions('notification-templates', params, () =>
      paginate<NotificationTemplateModel>(
        supabase
          .from('notification_templates')
          .select('id,trigger_key,channel,subject,locale,is_active', { count: 'exact' }),
        params,
        { field: 'trigger_key', ascending: true },
      ),
    ),
  );
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

export function useAuditLogs(params: PageParams) {
  return useQuery(
    pagedOptions('audit', params, () =>
      paginate<AuditLogModel>(
        supabase
          .from('audit_logs')
          .select('id,action,entity_type,entity_id,actor_id,occurred_at', { count: 'exact' }),
        params,
        { field: 'occurred_at', ascending: false },
      ),
    ),
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
