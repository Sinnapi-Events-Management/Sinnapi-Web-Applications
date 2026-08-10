import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { paginate, type PageParams, type Paged } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import type {
  VendorDetailModel,
  VendorMediaModel,
  VendorSearchCardModel,
  VendorSearchFilters,
  VendorSearchPage,
  VendorFacetCounts,
  FilterRefModel,
  BookingListModel,
  BookingDetailModel,
  BookingStatusEventModel,
  QuotationListModel,
  MyEventModel,
  EscrowModel,
  EscrowDetailModel,
  EscrowQuoteModel,
  EscrowEventModel,
  EscrowPayoutModel,
  PaymentModel,
  ConversationModel,
  MessageModel,
  ReviewModel,
  NotificationModel,
  ProfileModel,
} from '@/lib/types';

const VENDOR_CARD =
  'id,slug,business_name,base_city,primary_image_url,profile_image_url,starting_price,starting_price_currency,avg_rating,review_count,is_featured';

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

// Shared react-query options for a server-paginated list: the page params are
// part of the key (so each page/sort caches independently) and the previous
// page stays visible while the next one loads.
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
    // The list's own key stays the prefix, so existing broad invalidations
    // (`invalidateQueries({ queryKey: ['bookings'] })`) still match every page.
    queryKey: [...key, params.page, params.pageSize, params.sort, params.filters] as const,
    queryFn: fetcher,
    placeholderData: keepPreviousData,
  };
}

// ---------- Vendors ----------

/**
 * How many cards Discover pulls per "View more". Small on purpose: the grid is
 * image-heavy, and the marketplace is large enough that a first paint holding
 * the whole catalogue would cost seconds of transfer and decode for rows nobody
 * scrolls to. The RPC clamps anything above 48.
 */
export const VENDOR_PAGE_SIZE = 8;

/** The filter arguments shared by the grid query and the facet counts. */
function toVendorRpcArgs(filters: VendorSearchFilters) {
  return {
    p_q: filters.q ?? null,
    p_category: filters.category ?? null,
    p_region: filters.region ?? null,
    p_price_min: filters.priceMin ?? null,
    p_price_max: filters.priceMax ?? null,
    p_min_rating: filters.minRating ?? null,
  };
}

/** A `search_vendors_public` row: the card model plus the window count. */
type VendorSearchRow = VendorSearchCardModel & { total_count: number };

/**
 * Projects a result row onto the card model, dropping the window count that
 * rides along on every row. Spelled out rather than spread so the shape a card
 * receives is stated once, here at the data boundary, instead of being whatever
 * the RPC happens to return.
 */
function toVendorCard(row: VendorSearchRow): VendorSearchCardModel {
  return {
    id: row.id,
    slug: row.slug,
    business_name: row.business_name,
    base_city: row.base_city,
    biography: row.biography,
    primary_image_url: row.primary_image_url,
    profile_image_url: row.profile_image_url,
    starting_price: row.starting_price,
    starting_price_currency: row.starting_price_currency,
    avg_rating: row.avg_rating,
    review_count: row.review_count,
    is_featured: row.is_featured,
    categories: row.categories ?? [],
  };
}

/**
 * One page of the discovery grid.
 *
 * Search, category, region, price, rating, sort and paging all resolve inside
 * `search_vendors_public`, against the whole marketplace. The previous approach
 * — pull 36 rows, narrow them in the browser — could not be made correct here:
 * category and region live in join tables (`vendor_services`,
 * `vendor_service_regions`) that a card row never carries, so those filters
 * would silently do nothing, and price/rating would apply to whichever rows
 * happened to arrive first rather than to the catalogue.
 *
 * `total` rides on every row as a window count over the filtered set before
 * limit/offset, so "N of M" is the real total and there is no second count
 * query to fall out of sync with the page.
 */
async function searchVendors(
  filters: VendorSearchFilters,
  { offset, signal }: { offset: number; signal: AbortSignal },
): Promise<VendorSearchPage> {
  const { data, error } = await supabase
    .rpc('search_vendors_public', {
      ...toVendorRpcArgs(filters),
      p_sort: filters.sort ?? 'recommended',
      p_exclude_featured: false,
      p_limit: VENDOR_PAGE_SIZE,
      p_offset: offset,
    })
    .abortSignal(signal);
  throwIfAborted(signal);
  if (error) throw error;

  const rows = (data ?? []) as VendorSearchRow[];
  return {
    vendors: rows.map(toVendorCard),
    total: rows[0]?.total_count ?? 0,
    offset,
  };
}

/**
 * The paginated discovery grid, as an infinite query whose cursor is the row
 * offset. `total` comes back on every page, so "is there more" is a comparison
 * rather than a guess about whether a short page means the end.
 *
 * `keepPreviousData` is what makes filtering feel instant instead of flickery:
 * switching a facet keeps the current cards on screen (the page dims them via
 * `isRefreshing`) rather than unmounting the grid into skeletons and snapping
 * the page height around. The first load has no previous data, so it still gets
 * a proper loading state.
 *
 * `signal` is forwarded to PostgREST so a page superseded mid-flight — the
 * client changed a filter before it landed — is actually cancelled rather than
 * left to arrive and be discarded. Reading it off the context is also what arms
 * TanStack Query's cancellation: it only aborts a fetch whose queryFn consumed
 * the signal.
 */
export function useVendorSearch(filters: VendorSearchFilters) {
  return useInfiniteQuery({
    queryKey: ['vendors', 'search', filters],
    queryFn: ({ pageParam, signal }) => searchVendors(filters, { offset: pageParam, signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.offset + lastPage.vendors.length;
      // An empty page ends the list even if `total` disagrees, so a count that
      // shifts between requests can't leave "View more" fetching forever.
      if (lastPage.vendors.length === 0 || loaded >= lastPage.total) return undefined;
      return loaded;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Result counts for every category and region option under the current
 * filters, so each dropdown can label itself ("Photographer (24)") and disable
 * the options that lead nowhere. Each facet ignores its own selection — see
 * `count_vendor_facets_public` — so the counts answer "what would I get if I
 * switched to this", not "what am I already looking at".
 *
 * The RPC arguments double as the cache key, which is what keeps `sort` out of
 * it: `toVendorRpcArgs` never sends a sort, and re-ordering the grid cannot
 * change a count — so a re-sort reuses these results instead of refetching them.
 */
export function useVendorFacetCounts(filters: VendorSearchFilters) {
  const args = toVendorRpcArgs(filters);
  return useQuery({
    queryKey: ['vendors', 'facets', args],
    queryFn: async ({ signal }): Promise<VendorFacetCounts> => {
      const { data, error } = await supabase
        .rpc('count_vendor_facets_public', args)
        .abortSignal(signal);
      throwIfAborted(signal);
      if (error) throw error;
      return (
        (data ?? []) as { facet: keyof VendorFacetCounts; key: string; count: number }[]
      ).reduce(
        (acc, row) => {
          if (acc[row.facet]) acc[row.facet][row.key] = Number(row.count);
          return acc;
        },
        { category: {}, region: {} } as VendorFacetCounts,
      );
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Category and region options for the discovery filters, read from the same
 * reference tables the admin portal maintains rather than hard-coded here — a
 * category an admin adds or retires shows up without a client-portal release.
 * Both are world-readable (`ref_read_categories` / `ref_read_regions`) and
 * change rarely, so they are cached for the session.
 */
export function useFilterRefData() {
  return useQuery({
    queryKey: ['filter-ref-data'],
    staleTime: Infinity,
    queryFn: async () => {
      const [categories, regions] = await Promise.all([
        supabase
          .from('service_categories')
          .select('key,name')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('service_regions')
          .select('key,name')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ]);
      if (categories.error) throw categories.error;
      if (regions.error) throw regions.error;
      return {
        categories: (categories.data ?? []) as FilterRefModel[],
        regions: (regions.data ?? []) as FilterRefModel[],
      };
    },
  });
}

export function useVendor(slug: string) {
  return useQuery({
    queryKey: ['vendor', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(`${VENDOR_CARD},biography,website,pricing_model,lead_time,years_in_operation`)
        .eq('slug', slug)
        .eq('status', 'active')
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return (data as VendorDetailModel) ?? null;
    },
  });
}

/**
 * A public vendor's portfolio — the gallery on the vendor detail page.
 *
 * Ordered the way the vendor curated it: the primary shot first, then their own
 * `sort_order`, with `created_at` breaking ties so the sequence is stable across
 * refetches (the lightbox indexes into this array, so an unstable order would
 * move the image out from under an open viewer).
 *
 * `vmedia_read` exposes these rows to anon and authenticated alike for public
 * vendors, so no session is required.
 */
export function useVendorMedia(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-media', vendorId],
    enabled: Boolean(vendorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_media')
        .select('id,media_type,url,caption,is_primary,sort_order')
        .eq('vendor_id', vendorId)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as VendorMediaModel[];
    },
  });
}

// ---------- Bookings ----------
const BOOKING_LIST_SELECT =
  'id,reference_no,status,event_date,amount,currency,vendor_id,vendors(business_name,slug,primary_image_url)';

/** Statuses the dashboard treats as "still happening". */
const ACTIVE_BOOKING_STATUSES = ['requested', 'confirmed', 'in_progress'];

/** One page of the client's bookings, ordered by event date unless re-sorted. */
export function useBookings(params: PageParams) {
  return useQuery(
    pagedOptions(['bookings'], params, () =>
      paginate<BookingListModel>(
        supabase.from('bookings').select(BOOKING_LIST_SELECT, { count: 'exact' }),
        params,
        { field: 'event_date', ascending: false },
      ),
    ),
  );
}

/**
 * The dashboard's "upcoming" strip — the few active bookings it previews.
 *
 * A separate query from the paginated list on purpose: the dashboard wants a
 * fixed handful filtered by status, which the list's page/sort state has no
 * bearing on. Filtering and limiting happen server-side rather than by pulling
 * every booking down and slicing five off the front.
 */
export function useUpcomingBookings(limit = 5) {
  return useQuery({
    queryKey: ['bookings', 'upcoming', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(BOOKING_LIST_SELECT)
        .in('status', ACTIVE_BOOKING_STATUSES)
        .order('event_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as BookingListModel[];
    },
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*,vendors(business_name,slug,primary_image_url)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as BookingDetailModel) ?? null;
    },
  });
}

/**
 * A booking's status trail, oldest first — the order it reads in as a timeline.
 * The table is append-only and trigger-written, so this needs no invalidation
 * of its own: it is refetched alongside the booking whenever a status changes.
 */
export function useBookingStatusHistory(id: string) {
  return useQuery({
    queryKey: ['booking-history', id],
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

// ---------- Quotations ----------
const QUOTATION_LIST_SELECT =
  'id,reference_no,status,total,currency,valid_until,created_at,vendor_id,vendors(business_name,slug)';

/**
 * Quotes that are worth putting side by side: a draft or an expired quote is
 * not a live offer, so the comparison view never sees them.
 */
const COMPARABLE_QUOTE_STATUSES = ['sent', 'accepted', 'revised'];

/** One page of the client's quotations, newest first unless re-sorted. */
export function useQuotations(params: PageParams) {
  return useQuery(
    pagedOptions(['quotations'], params, () =>
      paginate<QuotationListModel>(
        supabase.from('quotations').select(QUOTATION_LIST_SELECT, { count: 'exact' }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

/**
 * One page of comparable quotes. The status narrowing happens server-side, so
 * the row count driving pagination counts only the quotes actually shown —
 * filtering the current page in the browser would have made "N rows" a lie.
 */
export function useComparableQuotations(params: PageParams) {
  return useQuery(
    pagedOptions(['quotations', 'comparable'], params, () =>
      paginate<QuotationListModel>(
        supabase
          .from('quotations')
          .select(QUOTATION_LIST_SELECT, { count: 'exact' })
          .in('status', COMPARABLE_QUOTE_STATUSES),
        params,
        { field: 'total', ascending: true },
      ),
    ),
  );
}

// ---------- Events ----------
export function useMyEvents() {
  return useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id,title,event_type,event_date,location,status,source')
        .eq('source', 'client')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyEventModel[];
    },
  });
}

// ---------- Escrow / Payments ----------
export function useEscrow() {
  return useQuery({
    queryKey: ['escrow'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          'id,status,gross_amount,net_payout_amount,agreed_amount,advance_amount,balance_amount,advance_release_due_at,auto_release_due_at,currency,booking_id,bookings(reference_no),vendors(business_name)',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EscrowModel[];
    },
  });
}

/**
 * One page of the client's payment history. Previously capped at 50 rows with
 * no way to reach the rest; pagination replaces the cap.
 */
export function usePayments(params: PageParams) {
  return useQuery(
    pagedOptions(['payments'], params, () =>
      paginate<PaymentModel>(
        supabase
          .from('payments')
          .select('id,purpose,amount,currency,status,provider,provider_method,paid_at,created_at', {
            count: 'exact',
          }),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
  );
}

// ---------- Messaging ----------
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id,type,subject,last_message_at,status,vendors(business_name)')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ConversationModel[];
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id,sender_id,body,created_at,moderation_status')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageModel[];
    },
  });
}

// ---------- Reviews / Notifications / Profile ----------
export function useReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id,rating,title,body,status,created_at,vendors(business_name,slug)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewModel[];
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,trigger_key,title,body,read_at,created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationModel[];
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,email,phone,avatar_url,locale,preferred_currency,mfa_enabled')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileModel) ?? null;
    },
  });
}

export function useDashboardCounts() {
  return useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: async () => {
      const [bookings, quotes, escrow, unread] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .in('status', ['requested', 'confirmed', 'in_progress']),
        supabase
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent'),
        supabase
          .from('escrow_transactions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['held', 'release_requested']),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null),
      ]);
      return {
        activeBookings: bookings.count ?? 0,
        openQuotes: quotes.count ?? 0,
        escrowHeld: escrow.count ?? 0,
        unread: unread.count ?? 0,
      };
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

// ---------- Escrow detail ----------

/**
 * The escrow behind one booking, or null when the client has not funded it yet.
 *
 * Keyed by booking rather than escrow id because that is what the caller has:
 * the booking page offers escrow before an escrow row exists.
 */
export function useBookingEscrow(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['booking-escrow', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('booking_id', bookingId!)
        .maybeSingle();
      if (error) throw error;
      return (data as EscrowDetailModel) ?? null;
    },
    enabled: !!bookingId,
  });
}

/**
 * What funding this booking would cost, priced by the same server function
 * that performs the charge.
 *
 * Deliberately not computed in the browser: commission and the processing fee
 * are charged on top of the agreed amount, and a preview that disagreed with
 * the charge by even a rounding step would be a trust problem on a money
 * screen. The rail matters because the fee rate differs per provider/method.
 */
export function useEscrowQuote(
  bookingId: string | undefined,
  provider: 'pesapal' | 'paypal',
  method: 'mtn_momo' | 'airtel_money' | 'card',
  enabled = true,
) {
  return useQuery({
    queryKey: ['escrow-quote', bookingId, provider, method],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('escrow_price_booking', {
          p_booking_id: bookingId!,
          p_provider: provider,
          p_method: method,
        })
        .maybeSingle();
      if (error) throw error;
      return (data as EscrowQuoteModel) ?? null;
    },
    enabled: enabled && !!bookingId,
  });
}

/** An escrow's append-only history, newest first. */
export function useEscrowEvents(escrowId: string | undefined) {
  return useQuery({
    queryKey: ['escrow-events', escrowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escrow_events')
        .select('id,event_type,amount,metadata,occurred_at')
        .eq('escrow_id', escrowId!)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EscrowEventModel[];
    },
    enabled: !!escrowId,
  });
}

/**
 * The tranches paid out to the vendor. Clients can see that their vendor was
 * paid and how — the visible half of the escrow promise — but never the
 * destination account, which stays encrypted behind an audited RPC.
 */
export function useEscrowPayouts(escrowId: string | undefined) {
  return useQuery({
    queryKey: ['escrow-payouts', escrowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payouts')
        .select(
          'id,kind,status,amount,currency,settlement_method,settlement_reference,settled_at,created_at',
        )
        .eq('escrow_id', escrowId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EscrowPayoutModel[];
    },
    enabled: !!escrowId,
  });
}

/**
 * Open the hosted PSP checkout for a booking.
 *
 * Every figure is derived server-side inside the edge function from the
 * booking being paid for; the browser sends only which booking and which rail.
 * Card details are entered on the provider's own pages and never reach Sinnapi.
 */
export function useStartEscrowPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      provider: 'pesapal' | 'paypal';
      method: 'mtn_momo' | 'airtel_money' | 'card';
    }) => {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: input,
      });
      if (error) {
        // The function returns a typed reason in the body; surface that rather
        // than the generic "Edge Function returned a non-2xx status code".
        const detail = await readFunctionError(error);
        throw new Error(detail);
      }
      return data as { paymentId: string; escrowId: string; checkoutUrl: string };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['booking-escrow', vars.bookingId] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

/** Human-readable reasons for the failures the escrow RPCs can raise. */
const ESCROW_ERRORS: Record<string, string> = {
  booking_not_confirmed: 'This booking has not been confirmed by the vendor yet.',
  advance_terms_not_accepted: 'Please approve the payment schedule before paying.',
  booking_amount_not_set: 'This booking has no agreed amount yet.',
  escrow_already_active: 'This booking has already been funded.',
  paypal_requires_card: 'PayPal only supports card payments.',
  booking_not_completed: 'You can confirm the service once the booking is marked complete.',
  forbidden: 'You do not have permission to do that.',
  refund_already_in_progress: 'A refund is already being processed for this booking.',
};

export function escrowErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  for (const [key, message] of Object.entries(ESCROW_ERRORS)) {
    if (raw.includes(key)) return message;
  }
  return raw || 'Something went wrong. Please try again.';
}

async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error) return String(body.error);
    } catch {
      /* body already consumed or not JSON — fall through */
    }
  }
  return error instanceof Error ? error.message : 'payment_failed';
}

// ---------- Generic RPC mutation helper ----------
export function useRpc(invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fn, args }: { fn: string; args: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}
