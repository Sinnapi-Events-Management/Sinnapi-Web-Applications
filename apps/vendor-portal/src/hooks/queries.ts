import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { paginate, type PageParams, type Paged } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { one } from '@/lib/rel';
import type {
  EventSearchFilters,
  EventSearchPage,
  EventFacetCounts,
  ServiceRegionModel,
  ProfileModel,
  MyApplicationModel,
  VendorBookingModel,
  VendorBookingDetailModel,
  BookingStatusEventModel,
  VendorQuotationModel,
  QuotationDetailModel,
  TemplateModel,
  ServiceModel,
  MediaModel,
  AvailabilityModel,
  BlockedDateModel,
  PublicEventModel,
  EventInterestModel,
  EscrowModel,
  PayoutModel,
  PromotionModel,
  DiscountModel,
  ReviewModel,
  PlanModel,
  ConversationModel,
  MessageModel,
  NotificationModel,
} from '@/lib/types';

// All reads are RLS-scoped: a vendor sees only rows for vendors they own.

// Shared react-query options for a server-paginated list: the page params are
// part of the key (so each page/sort caches independently) and the previous
// page stays visible while the next one loads. The list's own key stays the
// prefix, so existing broad invalidations (`['v-bookings']`) still match every
// page of every vendor.
//
// The pagination contract itself (`PageParams`/`Paged`/`paginate`) is shared
// across all three portals from `@sinnapi/ui`. Only this thin react-query
// binding is portal-local, since the design system does not depend on
// react-query.
function pagedOptions<Row>(
  key: readonly unknown[],
  params: PageParams,
  fetcher: () => Promise<Paged<Row>>,
) {
  return {
    queryKey: [...key, params.page, params.pageSize, params.sort, params.filters] as const,
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
        .select('id,full_name,email,phone,avatar_url,preferred_currency')
        .eq('id', user.id)
        .maybeSingle();
      return (data as ProfileModel) ?? null;
    },
  });
}

export function useMyApplication() {
  return useQuery({
    queryKey: ['my-application'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('vendor_applications')
        .select('id,status,business_name,is_reapplication,rejection_reason,submitted_at,created_at')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as MyApplicationModel) ?? null;
    },
  });
}

/** One page of the vendor's bookings, by event date unless re-sorted. */
export function useVendorBookings(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-bookings', vendorId], params, () =>
      paginate<VendorBookingModel>(
        supabase
          .from('bookings')
          .select(
            'id,reference_no,status,event_date,amount,currency,client_id,profiles:client_id(full_name)',
            { count: 'exact' },
          )
          .eq('vendor_id', vendorId!),
        params,
        { field: 'event_date', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

export function useVendorBooking(id: string) {
  return useQuery({
    queryKey: ['v-booking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*,profiles:client_id(full_name,email)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as VendorBookingDetailModel) ?? null;
    },
  });
}

/**
 * A booking's status trail, oldest first — the order it reads in as a timeline.
 * Keyed under the booking so `BookingResponseActions` can invalidate it with the
 * same `['v-booking', id]`-shaped refresh it already does after a status write.
 */
export function useVendorBookingStatusHistory(id: string) {
  return useQuery({
    queryKey: ['v-booking-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_status_history')
        .select('id,from_status,to_status,reason,occurred_at')
        .eq('booking_id', id)
        .order('occurred_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookingStatusEventModel[];
    },
    enabled: !!id,
  });
}

/** One page of the vendor's quote requests, newest first unless re-sorted. */
export function useVendorQuotations(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-quotations', vendorId], params, () =>
      paginate<VendorQuotationModel>(
        supabase
          .from('quotations')
          .select(
            'id,reference_no,status,total,currency,valid_until,request_details,created_at,client_id,profiles:client_id(full_name)',
            { count: 'exact' },
          )
          .eq('vendor_id', vendorId!),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: ['v-quotation', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('quotations')
        .select('*,quotation_items(*),profiles:client_id(full_name)')
        .eq('id', id)
        .maybeSingle();
      return (data as QuotationDetailModel) ?? null;
    },
  });
}

export function useTemplates(vendorId?: string) {
  return useQuery({
    queryKey: ['v-templates', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('quote_templates')
        .select('id,name,currency,notes,is_active,quote_template_items(id)')
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as TemplateModel[];
    },
  });
}

export function useServices(vendorId?: string) {
  return useQuery({
    queryKey: ['v-services', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendor_services')
        .select('id,title,description,base_price,currency,is_active,category_id')
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as ServiceModel[];
    },
  });
}

export function useMedia(vendorId?: string) {
  return useQuery({
    queryKey: ['v-media', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendor_media')
        .select('id,media_type,url,caption,is_primary,sort_order')
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      return (data ?? []) as MediaModel[];
    },
  });
}

export function useAvailability(vendorId?: string) {
  return useQuery({
    queryKey: ['v-availability', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendor_availability')
        .select('id,day_of_week,specific_date,start_time,end_time,is_available')
        .eq('vendor_id', vendorId!);
      return (data ?? []) as AvailabilityModel[];
    },
  });
}

export function useBlockedDates(vendorId?: string) {
  return useQuery({
    queryKey: ['v-blocked', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendor_blocked_dates')
        .select('id,blocked_date,reason,source')
        .eq('vendor_id', vendorId!)
        .order('blocked_date', { ascending: true });
      return (data ?? []) as BlockedDateModel[];
    },
  });
}

/**
 * Re-raises a cancelled request as a real `AbortError`.
 *
 * PostgREST catches an aborted fetch and hands it back as an ordinary
 * `{ error }` result rather than rejecting, so a superseded request would
 * otherwise surface as a genuine failure — a red error panel every time someone
 * changes a filter mid-flight. TanStack Query only treats a rejection as a
 * cancellation, so the abort has to be thrown, not returned.
 *
 * Call it after the await and before inspecting `error`.
 */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
}

// ---------- Public events ----------

/**
 * How many event cards the feed pulls per "View more". Deliberately small: a
 * vendor scanning for work reads the first few briefs carefully and abandons
 * the rest, so paying the transfer for fifty of them up front buys nothing. The
 * RPC clamps anything above 48.
 */
export const EVENT_PAGE_SIZE = 8;

/** The filter arguments shared by the feed query and the facet counts. */
function toEventRpcArgs(filters: EventSearchFilters) {
  return {
    p_q: filters.q ?? null,
    p_type: filters.type ?? null,
    p_source: filters.source ?? null,
    p_location: filters.location ?? null,
    p_budget_min: filters.budgetMin ?? null,
    p_budget_max: filters.budgetMax ?? null,
    p_when: filters.when ?? null,
  };
}

/** A `search_events_public` row: the card model plus the window count. */
type EventSearchRow = PublicEventModel & { total_count: number };

/**
 * Projects a result row onto the card model, dropping the window count that
 * rides along on every row. Spelled out rather than spread so the shape a card
 * receives is stated once, here at the data boundary, instead of being whatever
 * the RPC happens to return.
 */
function toEventCard(row: EventSearchRow): PublicEventModel {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    event_date: row.event_date,
    location: row.location,
    budget_min: row.budget_min,
    budget_max: row.budget_max,
    currency: row.currency,
    cover_image_url: row.cover_image_url,
    source: row.source,
  };
}

/**
 * One page of the public-events feed.
 *
 * Search, occasion, town, date band, budget, sort and paging all resolve inside
 * `search_events_public` — the same read the public site's events grid makes,
 * and one whose predicate (`status = 'published' and is_public and deleted_at
 * is null`) is exactly what this page was filtering for by hand.
 *
 * `total` rides on every row as a window count over the filtered set before
 * limit/offset, so "N of M" is the real total rather than the length of the
 * page in hand.
 */
async function searchPublicEvents(
  filters: EventSearchFilters,
  { offset, signal }: { offset: number; signal: AbortSignal },
): Promise<EventSearchPage> {
  const { data, error } = await supabase
    .rpc('search_events_public', {
      ...toEventRpcArgs(filters),
      p_sort: filters.sort ?? 'soonest',
      p_limit: EVENT_PAGE_SIZE,
      p_offset: offset,
    })
    .abortSignal(signal);
  throwIfAborted(signal);
  if (error) throw error;

  const rows = (data ?? []) as EventSearchRow[];
  return {
    events: rows.map(toEventCard),
    total: rows[0]?.total_count ?? 0,
    offset,
  };
}

/**
 * The paginated events feed, as an infinite query whose cursor is the row
 * offset. `total` comes back on every page, so "is there more" is a comparison
 * rather than a guess about whether a short page means the end.
 *
 * `keepPreviousData` keeps the current cards on screen while a new filter's
 * page lands (the page dims them via `isRefreshing`) instead of collapsing the
 * feed into skeletons on every keystroke.
 *
 * `signal` is forwarded to PostgREST so a page superseded mid-flight — the
 * vendor changed a filter before it landed — is actually cancelled rather than
 * left to arrive and be discarded. Reading it off the context is also what arms
 * TanStack Query's cancellation: it only aborts a fetch whose queryFn consumed
 * the signal.
 */
export function usePublicEventSearch(filters: EventSearchFilters) {
  return useInfiniteQuery({
    queryKey: ['public-events', 'search', filters],
    queryFn: ({ pageParam, signal }) => searchPublicEvents(filters, { offset: pageParam, signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.offset + lastPage.events.length;
      // An empty page ends the list even if `total` disagrees, so a count that
      // shifts between requests can't leave "View more" fetching forever.
      if (lastPage.events.length === 0 || loaded >= lastPage.total) return undefined;
      return loaded;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Result counts for every occasion, source, town and date band under the
 * current filters, so each dropdown can label itself ("Wedding (24)") and
 * disable the options that lead nowhere. Each facet ignores its own selection —
 * see `count_event_facets_public`.
 *
 * Towns are passed in rather than grouped out of the data: `events.location` is
 * free text, so the RPC counts each curated token by containment, the same way
 * the filter itself matches.
 *
 * The RPC arguments double as the cache key, which is what keeps `sort` out of
 * it: `toEventRpcArgs` never sends a sort, and re-ordering the feed cannot
 * change a count — so a re-sort reuses these results instead of refetching them.
 */
export function usePublicEventFacetCounts(filters: EventSearchFilters, locations: string[]) {
  const args = { ...toEventRpcArgs(filters), p_locations: locations };
  return useQuery({
    queryKey: ['public-events', 'facets', args],
    queryFn: async ({ signal }): Promise<EventFacetCounts> => {
      const { data, error } = await supabase
        .rpc('count_event_facets_public', args)
        .abortSignal(signal);
      throwIfAborted(signal);
      if (error) throw error;
      return (
        (data ?? []) as { facet: keyof EventFacetCounts; key: string; count: number }[]
      ).reduce(
        (acc, row) => {
          if (acc[row.facet]) acc[row.facet][row.key] = Number(row.count);
          return acc;
        },
        { type: {}, source: {}, location: {}, when: {} } as EventFacetCounts,
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useMyInterests(vendorId?: string) {
  return useQuery({
    queryKey: ['v-interests', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_interests')
        .select('event_id,status')
        .eq('vendor_id', vendorId!);
      return (data ?? []) as EventInterestModel[];
    },
  });
}

/** One page of escrow activity for the vendor's bookings (read-only). */
export function useVendorEscrow(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-escrow', vendorId], params, () =>
      paginate<EscrowModel>(
        supabase
          .from('escrow_transactions')
          .select(
            'id,status,gross_amount,commission_amount,net_payout_amount,agreed_amount,advance_amount,balance_amount,advance_release_due_at,advance_released_at,auto_release_due_at,currency,bookings(reference_no)',
            { count: 'exact' },
          )
          .eq('vendor_id', vendorId!),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

/** One page of the vendor's payout history, newest request first. */
export function useVendorPayouts(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-payouts', vendorId], params, () =>
      paginate<PayoutModel>(
        supabase
          .from('payouts')
          .select(
            'id,kind,amount,currency,status,provider,settlement_method,settlement_reference,settled_at,blocked_reason,approved_at,completed_at,created_at',
            {
              count: 'exact',
            },
          )
          .eq('vendor_id', vendorId!),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

export function usePromotions(vendorId?: string) {
  return useQuery({
    queryKey: ['v-promotions', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select('id,title,description,starts_at,ends_at,is_active')
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('starts_at', { ascending: false });
      return (data ?? []) as PromotionModel[];
    },
  });
}

/** One page of the vendor's discount codes, newest first unless re-sorted. */
export function useDiscounts(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-discounts', vendorId], params, () =>
      paginate<DiscountModel>(
        supabase
          .from('discounts')
          .select('id,code,type,value,currency,max_uses,used_count,starts_at,ends_at,is_active', {
            count: 'exact',
          })
          .eq('vendor_id', vendorId!)
          .is('deleted_at', null),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

export function useVendorReviews(vendorId?: string) {
  return useQuery({
    queryKey: ['v-reviews', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select(
          'id,rating,title,body,status,created_at,review_responses(id,body),profiles:client_id(full_name)',
        )
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false });
      return (data ?? []) as ReviewModel[];
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pricing_plans')
        .select(
          'id,key,name,description,price,currency,billing_cycle,sort_order,plan_features(feature_key,value)',
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return (data ?? []) as PlanModel[];
    },
  });
}

export function useVendorDashboard(vendorId?: string) {
  return useQuery({
    queryKey: ['v-dashboard', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const [requests, quoteReqs, escrowHeld, reviews] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId!)
          .eq('status', 'requested'),
        supabase
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId!)
          .eq('status', 'requested'),
        supabase
          .from('escrow_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId!)
          .in('status', ['held', 'release_requested', 'payout_approved']),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId!)
          .eq('status', 'published'),
      ]);
      return {
        bookingRequests: requests.count ?? 0,
        quoteRequests: quoteReqs.count ?? 0,
        escrowHeld: escrowHeld.count ?? 0,
        reviews: reviews.count ?? 0,
      };
    },
  });
}

// shared with client portal pattern
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
        .select('id,sender_id,body,created_at')
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

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread'],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      return count ?? 0;
    },
  });
}

// ---------- Service coverage ----------

/**
 * The regions a vendor can declare coverage for. Reference data that changes
 * rarely and is world-readable (`ref_read_regions`), so it's cached for the
 * session rather than refetched per visit to the profile.
 */
export function useServiceRegions() {
  return useQuery({
    queryKey: ['service-regions'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_regions')
        .select('key,name,scope')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServiceRegionModel[];
    },
  });
}

/**
 * The regions this vendor currently covers, as reference keys.
 *
 * Returned as keys rather than join-table ids because that is what both the
 * picker and `set_vendor_service_regions` speak — the row ids are an
 * implementation detail of the join table and never leave the database.
 */
export function useVendorCoverage(vendorId?: string) {
  return useQuery({
    queryKey: ['v-coverage', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_service_regions')
        .select('service_regions(key)')
        .eq('vendor_id', vendorId!);
      if (error) throw error;
      return ((data ?? []) as { service_regions: { key: string } | { key: string }[] | null }[])
        .map((row) => one(row.service_regions)?.key)
        .filter((key): key is string => Boolean(key));
    },
  });
}

/**
 * Replaces this vendor's coverage with `keys`.
 *
 * Goes through `set_vendor_service_regions` rather than issuing a delete and an
 * insert from here: coverage is a set, and a failure between two client-side
 * statements would leave the vendor with less coverage than they started with.
 */
export function useSetVendorCoverage(vendorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keys: string[]) => {
      const { error } = await supabase.rpc('set_vendor_service_regions', {
        p_vendor_id: vendorId,
        p_keys: keys,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v-coverage', vendorId] }),
  });
}
