import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  paginate,
  rpcErrorMessage,
  BOOKING_PAYMENT_WINDOW_COLUMNS,
  type PageParams,
  type Paged,
  type PaymentTermsPreview,
} from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { readFunctionError } from '@/lib/functions';
import { fetchLatestDeletionRequest } from '@/lib/accountApi';
import type {
  VendorDetailModel,
  VendorMediaModel,
  VendorSearchCardModel,
  VendorSearchFilters,
  VendorSearchPage,
  VendorFacetCounts,
  FilterRefModel,
  VendorOptionModel,
  BookingListModel,
  BookingDetailModel,
  BookingStatusEventModel,
  QuotationListModel,
  QuotationDetailModel,
  QuotationStatusEventModel,
  QuotationBookingModel,
  MyEventModel,
  EventTypeOption,
  EscrowModel,
  EscrowDetailModel,
  SettlementRequestModel,
  SettlementEventModel,
  EscrowQuoteModel,
  EscrowEventModel,
  EscrowPayoutModel,
  PaymentModel,
  ConversationModel,
  EngagedVendorModel,
  MessageModel,
  ReviewModel,
  NotificationModel,
  NotificationPage,
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
// The payment-window columns ride along on the list select so the bookings
// table and the dashboard strip can show a client which of their bookings is
// waiting on money — the one thing they most need to be told without opening
// each booking in turn.
const BOOKING_LIST_SELECT =
  'id,reference_no,status,event_date,amount,currency,payment_type,payment_terms_status,vendor_id,' +
  `${BOOKING_PAYMENT_WINDOW_COLUMNS},` +
  'vendors(business_name,slug,primary_image_url)';

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
      return (data ?? []) as unknown as BookingListModel[];
    },
  });
}

/**
 * One booking with everything behind it: the vendor, the quotation it was made
 * from with that quote's priced lines, and the event it hangs off.
 *
 * Embedded rather than fetched separately because all three answer questions
 * asked *about this booking* — "is this the price I agreed?", "which event was
 * this for?", "why can I not change the terms?" — and a second round trip per
 * card turns one page into four loading states.
 *
 * No RPC is involved: `quotations_read` matches on `client_id` and `q_items_rw`
 * follows it to the lines, so the client already had the grant. Both embeds
 * resolve to null on a booking placed straight against a service, which is the
 * common case and not an error.
 */
const BOOKING_DETAIL_SELECT = [
  '*',
  'vendors(business_name,slug,primary_image_url)',
  'quotations(id,reference_no,status,currency,subtotal,discount_total,tax_total,total,' +
    'valid_until,request_details,version_no,advance_rate,advance_release_days_before,' +
    'advance_terms_note,sent_at,responded_at,created_at,' +
    'quotation_items(id,description,quantity,unit_price,line_total,sort_order))',
  'events(id,title,event_date,location,payment_type,payment_terms_note)',
].join(',');

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(BOOKING_DETAIL_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BookingDetailModel) ?? null;
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

/**
 * One quotation, fully resolved: the vendor behind it, its priced lines and the
 * event it was requested for.
 *
 * Line items come back with the row rather than as a second read because a
 * quote without its breakdown is not a quote — there is no state of the detail
 * page that shows the total alone, so splitting them would only add a spinner.
 */
export function useQuotation(id: string) {
  return useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(
          '*,vendors(business_name,slug,primary_image_url),quotation_items(id,description,quantity,unit_price,line_total,sort_order),events(id,title,event_date,payment_type,payment_terms_note)',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as QuotationDetailModel) ?? null;
    },
    enabled: !!id,
  });
}

/**
 * The columns the quotation pages need about the booking made from a quote.
 *
 * The keyed variant repeats the list rather than concatenating onto the first:
 * supabase-js parses the select string as a *literal type* to infer the row
 * shape, and a runtime concatenation widens it to `string` — at which point the
 * inferred row becomes `GenericStringError` and the cast below stops compiling.
 */
const QUOTATION_BOOKING_SELECT = 'id,reference_no,status,event_date,start_time,end_time,location';
const QUOTATION_BOOKING_KEYED_SELECT =
  'id,reference_no,status,event_date,start_time,end_time,location,quotation_id';

/**
 * The booking made from this quotation, or null while it is still unscheduled.
 *
 * Read off `bookings` rather than embedded on the quotation because the
 * relation runs the other way — `bookings.quotation_id` is the foreign key — and
 * because this is the one fact on the page that changes without the quotation
 * row changing. Keying it separately lets the "create booking" write invalidate
 * just this.
 *
 * `maybeSingle` rather than a list: `ux_bookings_quotation` guarantees at most
 * one live booking per quote, so anything else is a schema violation and should
 * surface as an error rather than be silently sliced to `[0]`.
 */
export function useQuotationBooking(quotationId: string | undefined) {
  return useQuery({
    queryKey: ['quotation-booking', quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(QUOTATION_BOOKING_SELECT)
        .eq('quotation_id', quotationId!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return (data as QuotationBookingModel) ?? null;
    },
    enabled: !!quotationId,
  });
}

/** Stable empty map, so consumers do not re-render on every fetch. */
const EMPTY_QUOTATION_BOOKINGS: Record<string, QuotationBookingModel> = {};

/**
 * The bookings made from a page of quotations, keyed by quotation.
 *
 * One query for the whole page rather than one per row — the same shape as
 * `useProfileDirectory` in the vendor portal, and for the same reason: a list
 * column that needs a fact the row does not carry must not become N requests.
 *
 * The key is the sorted id list, so react-query treats a re-render with the
 * same page as the same cache entry without the caller holding a stable array.
 */
export function useQuotationBookings(quotationIds: Array<string | null | undefined>) {
  const unique = Array.from(new Set(quotationIds.filter((v): v is string => !!v))).sort();

  const query = useQuery({
    queryKey: ['quotation-bookings', unique] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(QUOTATION_BOOKING_KEYED_SELECT)
        .in('quotation_id', unique)
        .is('deleted_at', null);
      if (error) throw error;
      const rows = (data ?? []) as Array<QuotationBookingModel & { quotation_id: string }>;
      return Object.fromEntries(rows.map((r) => [r.quotation_id, r])) as Record<
        string,
        QuotationBookingModel
      >;
    },
    enabled: unique.length > 0,
  });

  return {
    bookings: query.data ?? EMPTY_QUOTATION_BOOKINGS,
    isLoading: query.isLoading,
  };
}

/**
 * A quotation's status trail, oldest first — the order it reads in as a
 * timeline. The table is append-only and trigger-written, so this needs no
 * invalidation of its own: it is refetched alongside the quotation whenever a
 * status changes.
 */
export function useQuotationStatusHistory(id: string) {
  return useQuery({
    queryKey: ['quotation-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_status_history')
        .select('id,from_status,to_status,reason,occurred_at')
        .eq('quotation_id', id)
        .order('occurred_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuotationStatusEventModel[];
    },
    enabled: !!id,
  });
}

// ---------- Events ----------
export function useMyEvents() {
  return useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id,title,event_date,location,status,source,budget_min,budget_max,currency,payment_type,payment_terms_note,event_type:event_types(key,name)',
        )
        .eq('source', 'client')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MyEventModel[];
    },
  });
}

/**
 * The occasions a client can file an event under, in the order an admin put
 * them in.
 *
 * Only active types: this list is a picker for *new* events, so a retired
 * occasion has no business appearing in it. Reference data that changes about
 * as often as the admin edits it, so it's cached for the session rather than
 * refetched per drawer open — `staleTime: Infinity` with the query invalidated
 * only by a fresh page load, which is the same bargain the vendor filter
 * reference data makes.
 */
export function useEventTypeOptions() {
  return useQuery({
    queryKey: ['event-type-options'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('id,name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventTypeOption[];
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

/** Query keys the realtime subscription invalidates. Kept here so the hook that
 *  owns the websocket and the hooks that own the data cannot drift apart. */
export const MESSAGING_KEYS = {
  conversations: ['conversations'] as const,
  unread: ['conversation-unread'] as const,
  unreadTotal: ['unread-messages'] as const,
  thread: (id: string) => ['messages', id] as const,
};

// PostgREST infers a row type from the *literal* text of the select, so this
// must stay a single string literal — concatenating it widens the type to
// `string` and the query starts returning `GenericStringError[]`.
const MESSAGE_SELECT =
  'id,sender_id,body,created_at,edited_at,is_system,moderation_status,message_attachments(id,storage_path,file_name,mime_type,size_bytes,scan_status)';

/**
 * The inbox, counterparty and unread count already resolved.
 *
 * One RPC rather than a select plus a second unread query: the counterparty
 * name is not readable from the browser at all (see `ConversationModel`), and
 * once the server is resolving that it may as well return the count it is
 * already positioned to compute. Ordering is applied inside the function.
 */
export function useConversations({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: MESSAGING_KEYS.conversations,
    // The inbox always wants this; the top bar's preview panel only wants it
    // once the user opens the panel. Same key either way, so the page finds a
    // warm cache when the panel got there first.
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_conversations');
      if (error) throw error;
      return (data ?? []) as ConversationModel[];
    },
  });
}

/** Single number for the sidebar badge. */
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: MESSAGING_KEYS.unreadTotal,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unread_message_count');
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}

/**
 * Vendors this client has actually engaged, merged from bookings and
 * quotations.
 *
 * This is the candidate list for "message a vendor" from the inbox. It is
 * deliberately not every vendor on the platform: a picker over the full
 * marketplace is a search problem that Discover already solves properly, and
 * the overwhelmingly common case is wanting to reach someone you are already
 * dealing with.
 */
export function useEngagedVendors() {
  return useQuery({
    queryKey: ['engaged-vendors'],
    queryFn: async () => {
      const sel = 'vendor:vendor_id(id,business_name,profile_image_url,slug)';
      const [bookings, quotations] = await Promise.all([
        supabase.from('bookings').select(sel).is('deleted_at', null),
        supabase.from('quotations').select(sel),
      ]);

      // A client with five bookings from one vendor should see them once.
      const byId = new Map<string, EngagedVendorModel>();
      for (const row of [...(bookings.data ?? []), ...(quotations.data ?? [])]) {
        const v = (row as { vendor: EngagedVendorModel | EngagedVendorModel[] | null }).vendor;
        const vendor = Array.isArray(v) ? v[0] : v;
        if (vendor?.id) byId.set(vendor.id, vendor);
      }
      return [...byId.values()].sort((a, b) => a.business_name.localeCompare(b.business_name));
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: MESSAGING_KEYS.thread(conversationId),
    // The inbox mounts this before a thread is picked; don't fetch on an empty id.
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
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

export const NOTIFICATIONS_PAGE_SIZE = 25;

const NOTIFICATION_SELECT = 'id,trigger_key,title,body,data,channel,read_at,created_at';

/**
 * The notification feed, paged.
 *
 * Infinite rather than a flat `limit(50)`: the feed is the client's whole
 * history with the platform and a fixed cap silently hid the tail of it. The
 * exact `count` rides along on every page so the summary tiles and tab badges
 * can describe the entire feed while only the first page is in hand.
 */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<NotificationPage> => {
      const from = pageParam * NOTIFICATIONS_PAGE_SIZE;
      const { data, count, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + NOTIFICATIONS_PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as NotificationModel[], total: count ?? 0 };
    },
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.rows.length, 0);
      // Stop on a short page too: `total` can shrink under us if rows are
      // purged between requests, and an empty page would otherwise loop.
      if (lastPage.rows.length === 0 || loaded >= lastPage.total) return undefined;
      return pages.length;
    },
  });
}

/**
 * The newest few notifications, for the top bar's preview panel.
 *
 * A separate query from the paged feed rather than a read of its first page:
 * that one is an infinite query with an exact `count`, and mounting it in the
 * shell would put the whole feed — and its paging state — behind every screen
 * in the portal to render six rows. Prefixed under `['notifications']` so the
 * feed's existing invalidations refresh this too.
 */
export function useRecentNotifications(
  limit: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['notifications', 'recent', limit],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_SELECT)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as NotificationModel[];
    },
  });
}

/** Flip one notification's read state. `read_at = null` puts it back to unread. */
export function useSetNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, read }: { ids: string[]; read: boolean }) => {
      if (ids.length === 0) return;
      // A direct update rather than `mark_notification_read`: that RPC only
      // stamps, and marking something back to unread is half of what makes
      // opening a notification a reversible act. RLS (`notif_update`) already
      // confines the write to the caller's own rows.
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: read ? new Date().toISOString() : null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: async () => {
      // Both keys: the feed drives the page, `unread` the sidebar badge.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['unread'] }),
      ]);
    },
  });
}

/** Stamp every unread notification for the signed-in user. */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read');
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['unread'] }),
      ]);
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
        .select(
          'id,full_name,email,phone,avatar_url,locale,preferred_currency,mfa_enabled,created_at',
        )
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileModel) ?? null;
    },
  });
}

/** Query key for the erasure request, so the settings page can invalidate it after filing one. */
export const DELETION_REQUEST_KEY = ['deletion-request'] as const;

/**
 * The account's latest right-to-erasure request, if it has ever made one.
 *
 * Read on the settings page to decide whether to offer the request button or
 * report the state of the request already in the compliance queue.
 */
export function useLatestDeletionRequest() {
  return useQuery({
    queryKey: DELETION_REQUEST_KEY,
    queryFn: fetchLatestDeletionRequest,
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

/**
 * The vendors a client can pick from, in a dropdown rather than a grid.
 *
 * WHY NOT `search_vendors_public`
 * The discovery grid's RPC is built for browsing: facets, relevance ranking,
 * window counts, a page size tuned for image-heavy cards. A picker wants none
 * of that and would pay for all of it — and, decisively, its sort whitelist has
 * no alphabetical option. A dropdown ordered by "recommended" is a dropdown
 * where a client who knows the name they want has to read every row to find it.
 *
 * So this reads the table directly and orders by name. `vendors_public_read`
 * (0011) already restricts an authenticated select to `status = 'active'`,
 * `visibility = 'public'` and undeleted rows, so the filter is RLS's job and
 * repeating it here would be a second copy of the rule to keep in step.
 *
 * The list is ordered by the *server*, which matters: sorting a truncated page
 * in the browser would alphabetise whichever rows happened to arrive, not the
 * catalogue. An empty query lists from the top; typing narrows it server-side.
 */
export const VENDOR_LOOKUP_LIMIT = 100;

const VENDOR_OPTION_SELECT = 'id,business_name,base_city,profile_image_url,primary_image_url';

/**
 * A typed search term as a PostgREST `ilike` value.
 *
 * The term goes in raw, and that is the correct answer rather than a lazy one.
 * It is tempting to wrap it in double quotes — PostgREST documents quoting as
 * the escape hatch for values containing reserved characters, and `ilike`
 * appends the pattern to the query string verbatim. Doing so breaks search
 * completely: the quotes are *not* stripped for a single-value operator, so
 * they end up inside the LIKE pattern and it matches nothing, returning a
 * cheerful `200 []`.
 *
 * Quoting is for contexts where commas and parens are structural — `in.(…)`
 * lists, `or=(…)` trees. In `col=ilike.<value>` the value runs to the end of
 * the parameter, so nothing inside it is syntax. Verified against PostgREST
 * directly: `,`, `.`, `:`, `(`, `)` and `"` all match correctly unquoted.
 *
 * `%` and `_` are left alone too. They are LIKE wildcards, not URL syntax, so a
 * client who types one simply gets a broader match — not an error, and not
 * something worth a backslash-escaping scheme to prevent.
 */
function toIlikePattern(term: string): string {
  return `%${term}%`;
}

export function useVendorLookup(query: string) {
  const q = query.trim();

  return useQuery({
    queryKey: ['vendors', 'lookup', q],
    queryFn: async ({ signal }) => {
      let request = supabase
        .from('vendors')
        .select(VENDOR_OPTION_SELECT)
        .order('business_name', { ascending: true })
        // One more than the cap, so the caller can tell a full list from a
        // truncated one without a second count query.
        .limit(VENDOR_LOOKUP_LIMIT + 1);

      // `ilike` rather than `like`: a client typing "sound" should find
      // "Kampala Sound Co". Substring rather than prefix, because half-recalled
      // names are usually recalled from the middle.
      if (q) request = request.ilike('business_name', toIlikePattern(q));

      const { data, error } = await request.abortSignal(signal);
      throwIfAborted(signal);
      if (error) throw error;

      const rows = (data ?? []) as VendorOptionModel[];
      return {
        vendors: rows.slice(0, VENDOR_LOOKUP_LIMIT),
        /** More matched than are being shown — the field says so. */
        isTruncated: rows.length > VENDOR_LOOKUP_LIMIT,
      };
    },
    // The catalogue does not move on a dialog's timescale, so reopening the
    // picker is instant rather than a fresh round trip.
    staleTime: 5 * 60 * 1000,
  });
}

// ---------- Payment terms ----------

/**
 * What each payment rail would cost for an amount, before a booking exists.
 *
 * `useEscrowQuote` cannot answer this: it prices a booking row, and the client
 * is choosing their terms precisely because there is no booking yet. Priced on
 * the server for the same reason that one is — commission and the processing
 * fee are charged on top of the agreed amount, and a comparison the browser
 * computed for itself would be a number we invented next to one we charge.
 *
 * Disabled at zero: an unpriced quote has nothing to compare, and a preview
 * reading `UGX 0` beside "Sinnapi service fee" is worse than no preview.
 */
export function usePaymentTermsPreview(
  amount: number | null | undefined,
  currency: string | null | undefined,
  /** The advance the client has settled on, or null for the proposed rate. */
  advanceRate: number | null = null,
  /** What the vendor proposed on the quote — the ceiling for the above. */
  proposedRate: number | null = null,
  enabled = true,
) {
  const value = Number(amount ?? 0);

  return useQuery({
    queryKey: ['payment-terms-preview', value, currency ?? 'UGX', advanceRate, proposedRate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('payment_terms_preview', {
        p_amount: value,
        p_currency: currency ?? 'UGX',
        p_advance_rate: advanceRate,
        p_proposed_rate: proposedRate,
      });
      if (error) throw error;
      // A `returns table` RPC arrives as an array of one row.
      const row = Array.isArray(data) ? data[0] : data;
      return (row as PaymentTermsPreview) ?? null;
    },
    enabled: enabled && value > 0,
    // Rates live in platform_settings and change on an admin's timescale, not a
    // client's. Refetching them per keystroke of an advance slider would be
    // three requests a second for an answer that has not moved.
    staleTime: 5 * 60 * 1000,
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
 * The settlement request on one booking, or `null` when the vendor has not
 * asked to be paid yet.
 *
 * Newest first and limited to one. Only one request can be live at a time, but
 * a contested or withdrawn one stays on the record and the vendor may
 * legitimately ask again — the latest row is the one this page is about.
 */
export function useBookingSettlement(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['booking-settlement', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlement_requests')
        .select('*')
        .eq('booking_id', bookingId!)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as SettlementRequestModel) ?? null;
    },
    enabled: !!bookingId,
  });
}

/** A settlement's visible trail, oldest first — the order it reads in. */
export function useSettlementEvents(requestId: string | undefined) {
  return useQuery({
    queryKey: ['settlement-events', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlement_events')
        .select('id,kind,actor_role,amount,note,created_at')
        .eq('request_id', requestId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SettlementEventModel[];
    },
    enabled: !!requestId,
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
  /**
   * The advance the client has chosen, or null to price at whatever the
   * booking already carries. Re-pricing on the server rather than splitting
   * the total in the browser is what keeps this preview identical to the
   * charge `activate_escrow` will make.
   */
  advanceRate: number | null = null,
) {
  return useQuery({
    queryKey: ['escrow-quote', bookingId, provider, method, advanceRate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('escrow_price_booking', {
          p_booking_id: bookingId!,
          p_provider: provider,
          p_method: method,
          p_advance_rate: advanceRate,
        })
        .maybeSingle();
      if (error) throw error;
      return (data as EscrowQuoteModel) ?? null;
    },
    enabled: enabled && !!bookingId,
    // Changing the advance or the rail re-queries. Holding the previous quote
    // while the new one lands keeps the figures on screen instead of dropping
    // the client back to skeletons on every adjustment.
    placeholderData: (previous) => previous,
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
  advance_rate_out_of_range: 'That advance is outside what your vendor agreed to.',
  advance_rate_above_platform_max: 'That advance is above what Sinnapi allows.',
  booking_not_completed: 'You can confirm the service once the booking is marked complete.',
  forbidden: 'You do not have permission to do that.',
  refund_already_in_progress: 'A refund is already being processed for this booking.',
  // The full-payment guard in `activate_escrow`. Unreachable today — the
  // pricing function computes all four figures and they add up by
  // construction — but a client must never meet a money assertion as a raw
  // Postgres exception, which is exactly the state this path would be in the
  // day the guard starts earning its place.
  partial_payment_not_allowed:
    'This booking has to be paid in full, in one payment. Please contact support — something is ' +
    'wrong with the amounts on this booking and we do not want to charge you the wrong figure.',
  // The booking was cancelled while the client sat on the checkout page.
  not_found: 'This booking is no longer available. It may have been cancelled.',
};

/**
 * The escrow RPCs refuse the same way the quotation and booking ones do, so
 * they are read the same way — see `rpcError.ts` in `@sinnapi/ui`. It matters
 * most here: this path is about money, and `[object Object]` over a payment
 * button is the version of this bug that stops someone from paying.
 */
export function escrowErrorMessage(error: unknown): string {
  return rpcErrorMessage(error, ESCROW_ERRORS);
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
